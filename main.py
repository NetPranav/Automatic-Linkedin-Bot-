"""
main.py
-------
LinkedIn Draft Widget - Backend API Server

FastAPI application that:
1. Receives raw content from the Tauri/Next.js Mac widget
2. Runs AI processing pipeline (vision → text, sequential VRAM management)
3. Sends draft previews to the MacBook approval frontend
4. Posts approved content to LinkedIn

Run with:
    uvicorn main:app --host 0.0.0.0 --port 8000 --reload

Or directly:
    python main.py
"""

import asyncio
import uuid
import logging
import os
from datetime import datetime
from pathlib import Path
from typing import List, Optional

import aiofiles
import uvicorn
from fastapi import (
    FastAPI, BackgroundTasks, HTTPException,
    Request, status
)
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles

from config import settings
from database import (
    init_database, save_draft, get_draft,
    get_drafts_awaiting_approval, delete_draft,
    update_draft_status, get_all_drafts
)
from models import (
    SubmitRawRequest, ApproveRequest, RejectRequest, RewriteRequest,
    Draft, DraftStatus, ImageLinkProcessed,
    SubmitResponse, CheckDraftsResponse, DraftPreview,
    PostApprovedResponse
)
from ai_pipeline import run_ai_pipeline, save_images_to_disk, rewrite_ai_pipeline
from linkedin_poster import auto_post_to_linkedin

# ============================================================
# Logging Configuration
# ============================================================

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger(__name__)


# ============================================================
# FastAPI Application Setup
# ============================================================

app = FastAPI(
    title="LinkedIn Draft Widget Backend",
    description=(
        "Local AI backend for processing LinkedIn posts. "
        "Receives raw notes and images, processes with local LLMs via Ollama, "
        "and publishes to LinkedIn API after user approval."
    ),
    version="1.0.0",
    docs_url="/docs",    # Swagger UI at /docs
    redoc_url="/redoc"   # ReDoc at /redoc
)


# ============================================================
# CORS Middleware
# ============================================================
# Allows requests from:
# - The Tauri widget on the Mac (any local IP)
# - The MacBook approval frontend
# - localhost for development
# ============================================================

app.add_middleware(
    CORSMiddleware,
    # Allow all origins - in production, restrict to your specific local IPs
    # e.g., ["http://192.168.29.88:3000", "http://192.168.29.89:3001"]
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)


# ============================================================
# Static Files (for serving saved images to the MacBook)
# ============================================================

# Mount the uploads directory so the MacBook preview frontend
# can fetch images via URL: http://192.168.29.88:8000/images/...
app.mount(
    "/images",
    StaticFiles(directory=settings.upload_dir),
    name="images"
)


# ============================================================
# Startup & Shutdown Events
# ============================================================

@app.on_event("startup")
async def startup_event():
    """
    Initialize everything when the server starts.
    - Set up SQLite database
    - Ensure uploads directory exists
    - Log configuration summary
    """
    logger.info("=" * 60)
    logger.info("LinkedIn Draft Widget Backend - Starting Up")
    logger.info("=" * 60)

    # Initialize database (creates tables + loads existing drafts)
    init_database()

    # Ensure upload directory exists
    Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)

    # Log configuration summary (hide sensitive values)
    logger.info(f"Server binding: {settings.backend_host}:{settings.backend_port}")
    logger.info(f"NVIDIA NIM Model: {settings.nvidia_nim_model}")
    logger.info(f"Frontend preview URL: {settings.frontend_preview_url}")
    logger.info(f"Upload directory: {settings.upload_dir}")

    # Warn if LinkedIn credentials look like defaults
    if "your_" in settings.linkedin_access_token:
        logger.warning(
            "⚠️  LinkedIn credentials appear to be default placeholders. "
            "Update LINKEDIN_ACCESS_TOKEN in .env before posting!"
        )

    logger.info("=" * 60)
    logger.info("Backend is ready. Waiting for requests...")
    logger.info("=" * 60)


@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on server shutdown."""
    logger.info("Backend shutting down...")


# ============================================================
# Health Check Endpoint
# ============================================================

@app.get("/health", tags=["System"])
async def health_check():
    """
    Health check endpoint.
    The Tauri widget checks this to show "AI Connected" / "AI Disconnected" status.
    """
    drafts = get_all_drafts()

    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "backend_ip": settings.backend_ip,
        "backend_port": settings.backend_port,
        "nvidia_nim_model": settings.nvidia_nim_model,
        "active_drafts": len(drafts),
        "pending_approval": len([d for d in drafts if d.status == DraftStatus.AWAITING_APPROVAL]),
        "processing": len([d for d in drafts if d.status == DraftStatus.PROCESSING]),
    }


# ============================================================
# ENDPOINT 1: Submit Raw Content
# POST /submit-raw
# ============================================================

@app.post(
    "/submit-raw",
    response_model=SubmitResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Draft Management"],
    summary="Submit raw notes and images for AI processing"
)
async def submit_raw(
    request: SubmitRawRequest,
    background_tasks: BackgroundTasks
):
    """
    Receives raw content from the Tauri Mac widget when user clicks 'Queue for AI'.

    This endpoint:
    1. Validates the incoming payload
    2. Saves images to disk immediately (fast, synchronous-ish)
    3. Creates a draft record with status 'processing'
    4. Triggers the AI pipeline as a background task
    5. Returns immediately with the draft ID

    The heavy AI work happens in the background - this endpoint returns fast
    so the frontend shows a "queued" confirmation immediately.

    Note: The frontend sends to /process-post - add that as an alias below.
    """
    logger.info(f"[SUBMIT] New submission received from frontend")
    logger.info(f"[SUBMIT] Text length: {len(request.text)} chars")
    logger.info(f"[SUBMIT] Tags: {request.tags}")
    logger.info(f"[SUBMIT] Image links count: {len(request.imageLinks)}")

    # Count total images across all image links
    total_images = sum(len(link.images) for link in request.imageLinks)
    logger.info(f"[SUBMIT] Total images attached: {total_images}")

    # Generate a unique ID for this draft
    draft_id = str(uuid.uuid4())
    now = datetime.utcnow()

    # Save images to disk BEFORE creating the background task
    # This needs to happen synchronously here because we need the paths
    # before we can save the draft object
    logger.info(f"[SUBMIT] Saving {total_images} images to disk...")

    try:
        processed_image_links = await save_images_to_disk(
            image_links=request.imageLinks,
            draft_id=draft_id
        )
        logger.info(f"[SUBMIT] Images saved successfully.")
    except Exception as e:
        logger.error(f"[SUBMIT] Failed to save images: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save uploaded images: {str(e)}"
        )

    # Create the draft record
    draft = Draft(
        id=draft_id,
        status=DraftStatus.PROCESSING,
        created_at=now,
        updated_at=now,
        raw_text=request.text,
        tags=request.tags,
        original_timestamp=request.timestamp,
        processed_image_links=processed_image_links,
    )

    # Persist to database
    save_draft(draft)
    logger.info(f"[SUBMIT] Draft {draft_id} created with status PROCESSING")

    # Queue the AI pipeline as a background task
    # FastAPI's BackgroundTasks runs this after the response is sent
    background_tasks.add_task(run_ai_pipeline, draft_id)
    logger.info(f"[SUBMIT] AI pipeline queued for draft {draft_id}")

    # Estimate processing time based on number of images
    # Rough estimate: 30s per image for vision + 60s for text generation
    estimated_time = (total_images * 30) + 60

    return SubmitResponse(
        draft_id=draft_id,
        status="processing",
        message=(
            f"Your content has been queued for AI processing. "
            f"Found {total_images} image(s) across {len(request.imageLinks)} context(s). "
            f"You'll receive a preview notification when ready."
        ),
        estimated_processing_time_seconds=estimated_time
    )


# ============================================================
# Alias: /process-post → /submit-raw
# The frontend widget is configured to send to /process-post
# This alias ensures backward compatibility
# ============================================================

@app.post(
    "/process-post",
    response_model=SubmitResponse,
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Draft Management"],
    summary="Alias for /submit-raw (frontend widget endpoint)"
)
async def process_post_alias(
    request: SubmitRawRequest,
    background_tasks: BackgroundTasks
):
    """
    Alias endpoint matching the URL configured in the Tauri widget:
    http://192.168.29.88:8000/process-post

    This simply calls the same logic as /submit-raw.
    """
    logger.info("[ALIAS] /process-post request received, routing to /submit-raw logic")
    return await submit_raw(request, background_tasks)


# ============================================================
# ENDPOINT 2: Check Pending Drafts
# GET /check-drafts
# ============================================================

@app.get(
    "/check-drafts",
    response_model=CheckDraftsResponse,
    tags=["Draft Management"],
    summary="Get all drafts awaiting user approval"
)
async def check_drafts():
    """
    Polled by the MacBook frontend to check for completed drafts.

    The MacBook frontend pings this periodically. When it comes online
    after being offline, it calls this and gets any queued drafts.

    Returns all drafts with status 'awaiting_approval'.
    Returns empty list if none are ready (safe to poll frequently).
    """
    logger.debug("[CHECK] /check-drafts polled")

    pending_drafts = get_drafts_awaiting_approval()

    if pending_drafts:
        logger.info(f"[CHECK] Returning {len(pending_drafts)} pending draft(s)")

    # Convert to preview format for the frontend
    draft_previews = []
    for draft in pending_drafts:
        preview = DraftPreview(
            id=draft.id,
            status=draft.status.value,
            generated_post_text=draft.generated_post_text or "",
            tags=draft.tags,
            suggested_images=[
                # Return URLs so the frontend can display the images
                f"http://{settings.backend_ip}:{settings.backend_port}/images/{Path(path).relative_to(settings.upload_dir).as_posix()}"
                for path in draft.suggested_images
            ],
            vision_summary=draft.vision_summary or "",
            created_at=draft.created_at.isoformat()
        )
        draft_previews.append(preview)

    return CheckDraftsResponse(
        pending_count=len(draft_previews),
        drafts=draft_previews
    )


# ============================================================
# ENDPOINT 3: Approve Draft and Post to LinkedIn
# POST /approve-draft/{id}
# ============================================================

@app.post(
    "/approve-draft/{draft_id}",
    response_model=PostApprovedResponse,
    tags=["Draft Management"],
    summary="Approve a draft and publish to LinkedIn"
)
async def approve_draft(
    draft_id: str,
    request: ApproveRequest,
    background_tasks: BackgroundTasks
):
    """
    Triggered when the user approves a draft on the MacBook frontend.

    The user can edit the generated text before approving.
    This endpoint triggers the LinkedIn posting in the background
    and returns immediately with a confirmation.

    Args:
        draft_id: The unique ID of the draft to approve
        request.final_text: The (possibly edited) post text
        request.selected_image_paths: Which images to use (optional)
    """
    logger.info(f"[APPROVE] Draft {draft_id} approval received")

    # Retrieve the draft
    draft = get_draft(draft_id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {draft_id} not found. It may have been rejected or never existed."
        )

    # Validate draft is in approvable state
    if draft.status not in [DraftStatus.AWAITING_APPROVAL]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Draft {draft_id} cannot be approved. "
                f"Current status: {draft.status.value}. "
                f"Expected: awaiting_approval"
            )
        )

    # Save the user's final approved text
    draft.final_approved_text = request.final_text
    draft.status = DraftStatus.APPROVED
    draft.updated_at = datetime.utcnow()

    # Update suggested images if user made a selection
    if request.selected_image_paths:
        local_paths = []
        for path_or_url in request.selected_image_paths:
            if "/images/" in path_or_url:
                filename = path_or_url.split("/images/")[-1]
                local_path = str(Path(settings.upload_dir) / filename)
                local_paths.append(local_path)
            else:
                local_paths.append(path_or_url)
        draft.suggested_images = local_paths

    save_draft(draft)
    logger.info(f"[APPROVE] Draft {draft_id} marked as APPROVED. Queuing LinkedIn post...")

    # Post to LinkedIn in background (non-blocking)
    background_tasks.add_task(post_draft_to_linkedin, draft_id)

    return PostApprovedResponse(
        draft_id=draft_id,
        linkedin_post_id="pending",  # Will be updated when background task completes
        linkedin_post_url="pending",
        message=(
            f"Draft approved! Publishing to LinkedIn in the background. "
            f"Check /draft-status/{draft_id} for the final post URL."
        )
    )


# ============================================================
# ENDPOINT 4: Rewrite Draft
# POST /rewrite-draft/{id}
# ============================================================

@app.post(
    "/rewrite-draft/{draft_id}",
    status_code=status.HTTP_202_ACCEPTED,
    tags=["Draft Management"],
    summary="Rewrite a draft with user edits"
)
async def rewrite_draft(
    draft_id: str,
    request: RewriteRequest,
    background_tasks: BackgroundTasks
):
    """
    Triggered when the user edits a draft and hits 'Rewrite with Changes'.
    Queues the draft to go back through the AI pipeline.
    """
    logger.info(f"[REWRITE] Draft {draft_id} rewrite requested")

    draft = get_draft(draft_id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {draft_id} not found."
        )

    draft.status = DraftStatus.PROCESSING
    draft.pipeline_stage = "text_generating"
    save_draft(draft)

    background_tasks.add_task(rewrite_ai_pipeline, draft_id, request.edited_text)

    return {"message": "Draft queued for rewrite"}


# ============================================================
# ENDPOINT 5: Reject Draft
# POST /reject-draft/{id}
# ============================================================

@app.post(
    "/reject-draft/{draft_id}",
    status_code=status.HTTP_200_OK,
    tags=["Draft Management"],
    summary="Reject and delete a draft"
)
async def reject_draft(
    draft_id: str,
    request: RejectRequest
):
    """
    Triggered when the user rejects a draft on the MacBook frontend.

    Removes the draft from the active queue. The draft is marked as
    'rejected' in SQLite for audit purposes but removed from memory.

    Optionally accepts feedback explaining why it was rejected
    (useful for future improvements to the AI pipeline).
    """
    logger.info(f"[REJECT] Draft {draft_id} rejection received")

    # Check the draft exists
    draft = get_draft(draft_id)
    if not draft:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {draft_id} not found."
        )

    # Log feedback if provided
    if request.feedback:
        logger.info(f"[REJECT] Rejection feedback for {draft_id}: {request.feedback}")
        draft.rejection_feedback = request.feedback
        save_draft(draft)

    # Delete from active memory, mark as rejected in SQLite
    delete_draft(draft_id)

    logger.info(f"[REJECT] Draft {draft_id} successfully rejected and removed from queue.")

    return {
        "draft_id": draft_id,
        "status": "rejected",
        "message": "Draft has been removed from the approval queue.",
        "feedback_recorded": bool(request.feedback)
    }


# ============================================================
# ENDPOINT 6: Check Draft Status
# GET /draft-status/{id}
# ============================================================

@app.get(
    "/draft-status/{draft_id}",
    tags=["Draft Management"],
    summary="Get the current status of a specific draft"
)
async def get_draft_status(draft_id: str):
    """
    Returns the current status and details of a specific draft.

    Useful for the frontend to poll after approving, to get the
    final LinkedIn post URL once the posting background task completes.
    """
    draft = get_draft(draft_id)

    if not draft:
        # Also check SQLite for rejected/posted drafts not in memory
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Draft {draft_id} not found."
        )

    return {
        "draft_id": draft.id,
        "status": draft.status.value,
        "created_at": draft.created_at.isoformat(),
        "updated_at": draft.updated_at.isoformat(),
        "generated_post_text": draft.generated_post_text,
        "final_approved_text": draft.final_approved_text,
        "linkedin_post_id": draft.linkedin_post_id,
        "linkedin_post_url": draft.linkedin_post_url,
        "error_message": draft.error_message,
        "tags": draft.tags,
        "suggested_image_count": len(draft.suggested_images),
        "image_urls": [
            f"http://{settings.backend_ip}:{settings.backend_port}/images/{Path(path).relative_to(settings.upload_dir).as_posix()}"
            for path in draft.suggested_images
        ]
    }


# ============================================================
# ENDPOINT 7: List All Drafts (Debug/Admin)
# GET /all-drafts
# ============================================================

@app.get(
    "/all-drafts",
    tags=["Admin"],
    summary="List all drafts in the system (for debugging)"
)
async def list_all_drafts():
    """
    Returns all drafts in memory regardless of status.
    Useful for debugging and monitoring.
    """
    drafts = get_all_drafts()

    return {
        "total": len(drafts),
        "drafts": [
            {
                "id": d.id,
                "status": d.status.value,
                "created_at": d.created_at.isoformat(),
                "updated_at": d.updated_at.isoformat(),
                "has_generated_text": bool(d.generated_post_text),
                "image_count": len(d.suggested_images),
                "error": d.error_message
            }
            for d in sorted(drafts, key=lambda x: x.created_at, reverse=True)
        ]
    }


# ============================================================
# ENDPOINT 8: Pipeline Status (Live Processing Progress)
# GET /pipeline-status
# ============================================================

STAGE_LABELS = {
    "saving_images": "📁 Saving images to disk...",
    "vision_loading": "🔬 Loading vision model into VRAM...",
    "vision_analyzing": "👁️ Analyzing images with AI vision...",
    "vision_unloading": "🔄 Unloading vision model from VRAM...",
    "text_loading": "🧠 Loading text model into VRAM...",
    "text_generating": "✍️ Generating LinkedIn post (this may take 1-3 min)...",
    "text_unloading": "🔄 Unloading text model from VRAM...",
    "saving_draft": "💾 Saving your draft...",
    "complete": "✅ Draft ready for review!",
    "failed": "❌ Pipeline failed",
}


@app.get(
    "/pipeline-status",
    tags=["System"],
    summary="Get real-time pipeline processing status for all active drafts"
)
async def pipeline_status():
    """
    Returns the current pipeline stage for any draft that is actively processing.
    The frontend polls this to show live progress feedback.
    """
    drafts = get_all_drafts()

    processing_drafts = []
    for d in drafts:
        if d.status == DraftStatus.PROCESSING or (
            d.pipeline_stage and d.pipeline_stage not in ("complete", None)
        ):
            stage_key = d.pipeline_stage or "unknown"
            # Handle dynamic stages like "vision_analyzing (3 images)"
            label = STAGE_LABELS.get(stage_key)
            if not label:
                for key in STAGE_LABELS:
                    if stage_key.startswith(key):
                        label = f"👁️ {stage_key.replace('_', ' ').title()}"
                        break
                if not label:
                    label = stage_key.replace("_", " ").title()

            processing_drafts.append({
                "draft_id": d.id,
                "status": d.status.value,
                "pipeline_stage": stage_key,
                "stage_label": label,
                "current_generation": getattr(d, "current_generation", None),
                "error": d.error_message,
                "updated_at": d.updated_at.isoformat(),
            })

    # Sort so the most recently updated draft is always first (drafts[0] in frontend)
    processing_drafts.sort(key=lambda x: x["updated_at"], reverse=True)

    return {
        "processing_count": len(processing_drafts),
        "drafts": processing_drafts,
    }


# ============================================================
# Background Task: Post to LinkedIn
# ============================================================

async def post_draft_to_linkedin(draft_id: str):
    """
    Background task that handles the actual LinkedIn API posting.

    Called after user approves a draft. Runs asynchronously so the
    approve endpoint returns immediately to the user.

    LinkedIn API calls are synchronous (requests library) but we
    run them in an executor to avoid blocking the event loop.
    """
    logger.info(f"[LINKEDIN POST] Starting LinkedIn post for draft {draft_id}")

    draft = get_draft(draft_id)
    if not draft:
        logger.error(f"[LINKEDIN POST] Draft {draft_id} not found. Cannot post.")
        return

    # Determine which text to post
    post_text = draft.final_approved_text or draft.generated_post_text
    if not post_text:
        logger.error(f"[LINKEDIN POST] No text available for draft {draft_id}")
        draft.status = DraftStatus.FAILED
        draft.error_message = "No text available to post"
        save_draft(draft)
        return

    # Get the thumbnail image path (first suggested image)
    image_path = draft.suggested_images[0] if draft.suggested_images else None

    try:
        # Run the LinkedIn automation in a thread pool executor
        # (PyAutoGUI is synchronous and needs to control the mouse)
        loop = asyncio.get_event_loop()
        success, message = await loop.run_in_executor(
            None,  # Use default thread pool
            lambda: auto_post_to_linkedin(
                title=draft.raw_text[:50] + "...", # Or extract a title
                description=post_text,
                image_paths=draft.suggested_images
            )
        )

        # Update draft with details
        draft.linkedin_post_id = "automation_success"
        draft.linkedin_post_url = "https://www.linkedin.com/in/me/recent-activity/shares/"
        draft.status = DraftStatus.POSTED
        draft.updated_at = datetime.utcnow()
        save_draft(draft)

        logger.info(
            f"[LINKEDIN POST] ✅ Successfully posted to LinkedIn! "
            f"Draft: {draft_id}, Post ID: {draft.linkedin_post_id}"
        )
        logger.info(f"[LINKEDIN POST] View post at: {draft.linkedin_post_url}")

    except Exception as e:
        logger.error(
            f"[LINKEDIN POST] ❌ Failed to post to LinkedIn for draft {draft_id}: {e}",
            exc_info=True
        )

        draft.status = DraftStatus.FAILED
        draft.error_message = f"LinkedIn posting failed: {str(e)}"
        draft.updated_at = datetime.utcnow()
        save_draft(draft)


# ============================================================
# Global Exception Handler
# ============================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """
    Catch-all exception handler to ensure errors are logged properly
    and return JSON instead of HTML error pages.
    """
    logger.error(
        f"Unhandled exception on {request.method} {request.url}: {exc}",
        exc_info=True
    )

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "path": str(request.url),
            "timestamp": datetime.utcnow().isoformat()
        }
    )


# ============================================================
# Application Entry Point
# ============================================================

if __name__ == "__main__":
    """
    Run directly with: python main.py
    Or with uvicorn: uvicorn main:app --host 0.0.0.0 --port 8000 --reload
    """
    uvicorn.run(
        "main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=False,           # Set to True during development
        log_level="info",
        access_log=True,
        # workers=1 is critical - we manage shared state (VRAM, database)
        # Multiple workers would cause VRAM conflicts and race conditions
        workers=1
    )