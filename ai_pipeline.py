"""
ai_pipeline.py
--------------
The core AI processing pipeline with strict sequential model loading.

CRITICAL: This machine has 8GB VRAM. Only ONE model can be loaded at a time.
The pipeline enforces this by:
1. Loading vision model
2. Getting vision output
3. FORCE UNLOADING vision model (keep_alive=0)
4. Waiting for VRAM to clear
5. Loading text model
6. Getting text output
7. FORCE UNLOADING text model

Never load two models simultaneously. The wait after unloading is critical.
"""

import re

import asyncio
import aiohttp
import aiofiles
import base64
import json
import logging
import time
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional, Tuple

from config import settings
from models import (
    Draft, DraftStatus, ImageLink, ImageLinkProcessed
)
from database import save_draft, get_draft

logger = logging.getLogger(__name__)


# ============================================================
# (VRAM Management removed - using NVIDIA NIM API)
# ============================================================


# ============================================================
# Image Processing Utilities
# ============================================================

def parse_base64_image(data_uri: str) -> Tuple[bytes, str]:
    """
    Parse a Base64 Data URI from the frontend into raw bytes.

    Frontend sends: "data:image/jpeg;base64,/9j/4AAQSkZJRg..."
    We need: raw bytes + file extension

    Returns:
        Tuple of (image_bytes, file_extension)
    """
    if "," not in data_uri:
        raise ValueError(f"Invalid Data URI format - no comma found")

    # Split "data:image/jpeg;base64" from the actual base64 data
    header, base64_data = data_uri.split(",", 1)

    # Extract the MIME type from the header
    # header looks like: "data:image/jpeg;base64"
    mime_type = "image/jpeg"  # default
    if ":" in header and ";" in header:
        mime_part = header.split(":")[1].split(";")[0]
        mime_type = mime_part.strip()

    # Map MIME type to file extension
    mime_to_ext = {
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/png": "png",
        "image/gif": "gif",
        "image/webp": "webp",
    }
    extension = mime_to_ext.get(mime_type, "jpg")

    # Decode the base64 data to raw bytes
    image_bytes = base64.b64decode(base64_data)

    return image_bytes, extension


async def save_images_to_disk(
    image_links: List[ImageLink],
    draft_id: str
) -> List[ImageLinkProcessed]:
    """
    Save all Base64 images from the frontend to local disk.

    Creates a directory structure: uploads/{draft_id}/imagelink_{i}/image_{j}.jpg
    Returns ImageLinkProcessed objects with filesystem paths instead of Base64 strings.
    """
    processed_links = []

    for link_idx, image_link in enumerate(image_links):
        saved_paths = []

        for img_idx, image_data_uri in enumerate(image_link.images):
            try:
                # Parse the base64 data URI
                image_bytes, extension = parse_base64_image(image_data_uri)

                # Build save path
                save_dir = Path(settings.upload_dir) / draft_id / f"imagelink_{link_idx}"
                save_dir.mkdir(parents=True, exist_ok=True)

                filename = f"image_{img_idx}.{extension}"
                file_path = save_dir / filename

                # Write image bytes to disk asynchronously
                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(image_bytes)

                saved_paths.append(str(file_path))
                logger.info(f"Saved image to: {file_path} ({len(image_bytes)} bytes)")

            except Exception as e:
                logger.error(
                    f"Failed to save image {img_idx} for link {link_idx} "
                    f"in draft {draft_id}: {e}"
                )
                # Continue processing other images

        # Create processed version of this image link
        processed_link = ImageLinkProcessed(
            text=image_link.text,
            startIndex=image_link.startIndex,
            endIndex=image_link.endIndex,
            image_paths=saved_paths
        )
        processed_links.append(processed_link)

    return processed_links


# ============================================================
# Step A: Vision Model Processing
# ============================================================

async def run_vision_model(
    session: aiohttp.ClientSession,
    processed_image_links: List[ImageLinkProcessed],
    raw_text: str
) -> str:
    """
    STEP A: Load vision model and analyze all images.

    For each image, we tell the model WHAT TEXT it relates to (from startIndex/endIndex).
    This gives the AI crucial context about WHY the user attached each image.

    The vision model ONLY runs here. After this function returns,
    we immediately force-unload it before touching the text model.
    """
    logger.info(f"[STEP A] Starting vision model: {settings.nvidia_nim_model}")

    all_descriptions = []

    for link_idx, image_link in enumerate(processed_image_links):
        if not image_link.image_paths:
            logger.warning(f"No saved images for link {link_idx}, skipping vision.")
            continue

        for img_idx, image_path in enumerate(image_link.image_paths):
            try:
                # Read image from disk and re-encode to base64 for Ollama API
                async with aiofiles.open(image_path, 'rb') as f:
                    image_bytes = await f.read()

                image_b64 = base64.b64encode(image_bytes).decode('utf-8')

                # Build a context-aware prompt using the text mapping
                # This tells the model WHY the user attached this image
                prompt = f"""You are analyzing an image that a LinkedIn user attached to their post.

CONTEXT - The full post text is:
"{raw_text}"

SPECIFIC CONTEXT - This image was attached to the phrase:
"{image_link.text}" (characters {image_link.startIndex} to {image_link.endIndex})

Your task:
1. Describe what you see in the image in detail
2. Explain how it relates to the highlighted text above
3. Identify key elements, people, settings, or objects
4. Note the mood and energy of the image
5. Suggest how this image strengthens the LinkedIn post

Be detailed but professional. This description will be used to write a compelling LinkedIn post."""

                # NVIDIA NIM Vision API call
                mime_ext_map = {"jpg": "jpeg", "jpeg": "jpeg", "png": "png", "webp": "webp", "gif": "gif"}
                img_path = Path(image_path)
                ext = img_path.suffix.lower().lstrip('.')
                mime_type = f"image/{mime_ext_map.get(ext, 'jpeg')}"
                
                vision_payload = {
                    "model": settings.nvidia_nim_model,
                    "messages": [
                        {
                            "role": "user",
                            "content": [
                                {"type": "text", "text": prompt},
                                {
                                    "type": "image_url",
                                    "image_url": {
                                        "url": f"data:{mime_type};base64,{image_b64}"
                                    }
                                }
                            ]
                        }
                    ],
                    "max_tokens": 1024,
                    "stream": False
                }
                
                headers = {
                    "Authorization": f"Bearer {settings.nvidia_nim_api_key}",
                    "Content-Type": "application/json"
                }

                logger.info(
                    f"[STEP A] Sending image {img_idx+1} of link {link_idx+1} "
                    f"to {settings.nvidia_nim_model}..."
                )

                async with session.post(
                    "https://integrate.api.nvidia.com/v1/chat/completions",
                    json=vision_payload,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=300)  # Vision can be slow
                ) as response:
                    if response.status != 200:
                        error_text = await response.text()
                        logger.error(f"Vision model error: {error_text}")
                        continue

                    result = await response.json()
                    logger.debug(f"[STEP A] Raw vision response keys: {list(result.keys())}")

                    # OpenAI format returns content in choices[0].message.content
                    description = result.get("choices", [{}])[0].get("message", {}).get("content", "").strip()

                    # Strip <think>...</think> tags from thinking models (if any)
                    description = re.sub(r"<think>.*?</think>", "", description, flags=re.DOTALL).strip()

                    logger.info(
                        f"[STEP A] Got vision description for image {img_idx+1} "
                        f"({len(description)} chars)"
                    )

                    # Store description alongside the processed image link
                    if img_idx < len(image_link.vision_descriptions):
                        image_link.vision_descriptions[img_idx] = description
                    else:
                        image_link.vision_descriptions.append(description)

                    # Build the structured description for the text model
                    description_entry = (
                        f"IMAGE {img_idx+1} (attached to text: '{image_link.text}'):\n"
                        f"{description}"
                    )
                    all_descriptions.append(description_entry)

            except asyncio.TimeoutError:
                logger.error(f"[STEP A] Vision model timed out for image {image_path}")
            except Exception as e:
                logger.error(f"[STEP A] Error processing image {image_path}: {e}")

    # Combine all descriptions into one comprehensive summary
    if all_descriptions:
        combined_summary = "\n\n---\n\n".join(all_descriptions)
        logger.info(f"[STEP A] Vision processing complete. "
                   f"Total description length: {len(combined_summary)} chars")
        return combined_summary
    else:
        logger.warning("[STEP A] No image descriptions generated.")
        return "No images were successfully analyzed."


# ============================================================
# Shared NIM API Call (used by text model and rewrite pipeline)
# ============================================================

async def call_nim_api(session: aiohttp.ClientSession, prompt: str, stage_name: str, draft_id: str = None) -> str:
    """
    Calls the NVIDIA NIM API with streaming and saves progress to the draft.
    This is a standalone function that can be used by any pipeline step.
    """
    if draft_id:
        from database import get_draft, save_draft
        d = get_draft(draft_id)
        if d:
            d.pipeline_stage = stage_name
            d.current_generation = ""
            save_draft(d)

    payload = {
        "model": settings.nvidia_nim_model,
        "messages": [{"role": "user", "content": prompt}],
        "stream": True,
        "max_tokens": 1024,
        "temperature": 0.7,
        "top_p": 0.9
    }
    
    headers = {
        "Authorization": f"Bearer {settings.nvidia_nim_api_key}",
        "Content-Type": "application/json"
    }
    
    full_response = ""
    final_content = ""
    last_save_time = time.time()
    
    try:
        async with session.post(
            "https://integrate.api.nvidia.com/v1/chat/completions",
            json=payload,
            headers=headers,
            timeout=aiohttp.ClientTimeout(total=300)
        ) as response:
            if response.status != 200:
                error_text = await response.text()
                raise Exception(f"NIM API returned {response.status}: {error_text}")
            
            async for line in response.content:
                if line:
                    line_text = line.decode('utf-8').strip()
                    if not line_text or line_text == "data: [DONE]":
                        continue
                        
                    if line_text.startswith("data: "):
                        try:
                            data = json.loads(line_text[6:])
                            chunk = data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                            
                            if chunk:
                                full_response += chunk
                                final_content += chunk
                                
                            if draft_id and time.time() - last_save_time > 0.5:
                                from database import get_draft, save_draft
                                d = get_draft(draft_id)
                                if d:
                                    d.current_generation = full_response
                                    save_draft(d)
                                last_save_time = time.time()
                        except json.JSONDecodeError:
                            continue
    except asyncio.TimeoutError:
        raise Exception("NIM API timed out after 300 seconds")
        
    # Final save to ensure UI gets 100% of the stream
    if draft_id:
        from database import get_draft, save_draft
        d = get_draft(draft_id)
        if d:
            d.current_generation = full_response
            save_draft(d)
            
    return final_content


# ============================================================
# Step C: Text Model Processing
# ============================================================

async def run_text_model(
    session: aiohttp.ClientSession,
    raw_text: str,
    tags: List[str],
    vision_summary: str,
    processed_image_links: List[ImageLinkProcessed],
    draft_id: str = None
) -> Tuple[str, List[str]]:
    """
    STEP C: Load text model and generate the final LinkedIn post.

    This runs AFTER the vision model has been completely unloaded.
    Uses the vision descriptions as rich context to craft a compelling post.

    Returns:
        Tuple of (generated_post_text, suggested_image_paths)
    """
    logger.info(f"[STEP C] Starting text model: {settings.nvidia_nim_model} (Multi-Step Pipeline)")

    # Current date/time context for temporal awareness
    from datetime import datetime as dt
    now = dt.now()
    current_datetime = now.strftime("%A, %B %d, %Y at %I:%M %p")
    day_of_week = now.strftime("%A")

    # Build context about which images are available
    available_images_context = []
    all_image_paths = []

    for link_idx, link in enumerate(processed_image_links):
        for img_idx, img_path in enumerate(link.image_paths):
            image_key = f"IMAGE_{link_idx}_{img_idx}"
            all_image_paths.append(img_path)
            available_images_context.append(
                f"- {image_key}: Shows '{link.text}' context"
            )

    images_list_text = "\n".join(available_images_context) if available_images_context \
        else "No images available"

    formatted_tags = " ".join([f"#{tag}" for tag in tags])

    # Helper that delegates to the standalone function
    async def _call_api(prompt: str, stage_name: str) -> str:
        return await call_nim_api(session, prompt, stage_name, draft_id)

    # ---------------------------------------------------------
    # PHASE 1: PLANNING
    # ---------------------------------------------------------
    logger.info("[STEP C.1] Generating Outline...")
    planning_prompt = f"""You are a skilled LinkedIn content writer.

=== CURRENT DATE & TIME ===
Today is {current_datetime}.
If the user mentions events like "yesterday", "2 days ago", "last week", calculate the ACTUAL date.

=== RAW NOTES FROM USER ===
{raw_text}

=== IMAGE CONTEXT (from vision analysis) ===
{vision_summary}

=== USER'S HASHTAGS ===
{formatted_tags}

Create a content outline with:
1. **Hook** - An engaging opening that captures attention
2. **Core Story** - What happened, what was the experience
3. **Takeaway** - What was learned or what's valuable for readers
4. **CTA** - A natural question or conversation starter

IMPORTANT:
- Stay FAITHFUL to what the user actually wrote. Do NOT exaggerate or over-hype.
- If they got 2nd place, say 2nd place. If they participated, say participated. Be honest.
- NEVER use literal image keys like IMAGE_0_0.
"""
    
    outline = await _call_api(planning_prompt, "text_planning")
    
    # ---------------------------------------------------------
    # PHASE 2: DRAFTING
    # ---------------------------------------------------------
    logger.info("[STEP C.2] Drafting Post...")
    drafting_prompt = f"""You are a skilled LinkedIn content writer.

=== CURRENT DATE & TIME ===
Today is {current_datetime} ({day_of_week}).
Use this to make temporal references accurate.

=== RAW NOTES FROM USER ===
{raw_text}

=== YOUR OUTLINE ===
{outline}

=== IMAGE CONTEXT ===
{vision_summary}

Write the FINAL LinkedIn post based on the user's notes and your outline.

**FORMAT:**
- Start with a strong 1-2 line hook
- Use short paragraphs (1-3 sentences)
- Add strategic line breaks for readability
- End with a question or conversation starter
- Place hashtags on the VERY LAST LINE: {formatted_tags}

**TONE:**
- Authentic and conversational — write like a real person sharing their experience
- Confident but grounded — do NOT exaggerate or over-hype
- Use "I", "we", "you" naturally

**CRITICAL ACCURACY RULES:**
- Stay 100% FAITHFUL to the user's actual notes. Do NOT exaggerate achievements.
- If they got 2nd place, write 2nd place. Do NOT say "we revolutionized" or "we changed the game".
- If they participated in something, describe it accurately — don't inflate it.
- Use the user's own words and energy level as your guide.
- NEVER include image placeholders or keys (like IMAGE_0_0)
- NEVER start with "I'm excited to share" or "I'm thrilled to announce"
- DO NOT add emojis unless the user's notes used them
- Output ONLY the final post text. No commentary.
"""
    
    generated_post = await _call_api(drafting_prompt, "text_drafting")
    
    # ---------------------------------------------------------
    # PHASE 3: POLISH & CLEANUP
    # ---------------------------------------------------------
    logger.info("[STEP C.3] Polishing...")

    review_prompt = f"""You are a copy editor. Polish this LinkedIn post.

=== DRAFT ===
{generated_post}

=== TODAY ===
{current_datetime}

=== USER'S ORIGINAL NOTES (for accuracy check) ===
{raw_text}

Your job:
1. Fix grammar and awkward phrasing
2. Verify temporal references are accurate
3. VERIFY the post does not exaggerate the user's achievements. Compare against their original notes.
4. Make sure line breaks create good readability
5. Verify hashtags are at the very end
6. Remove ANY literal image tags like IMAGE_0_0

Output ONLY the final polished post. No commentary."""

    polished_post = await _call_api(review_prompt, "text_reviewing")

    # Use polished version if it's reasonable, otherwise fall back to draft
    final_post = polished_post if len(polished_post.strip()) > 50 else generated_post

    # The user wants to post ALL of the images they provided.
    suggested_image_paths = all_image_paths
    logger.info(f"[STEP C.3] Attached {len(suggested_image_paths)} images to the final post.")

    return final_post, suggested_image_paths


# ============================================================
# Main Pipeline Orchestrator
# ============================================================

async def run_ai_pipeline(draft_id: str):
    """
    The complete AI processing pipeline for a single draft.

    This is the main background task. It runs in sequence and manages
    VRAM carefully to avoid out-of-memory errors on the 8GB VRAM machine.

    Pipeline:
        Save images → Vision model → Unload vision → Text model → Unload text → Save draft
    """
    logger.info(f"[PIPELINE] Starting AI pipeline for draft: {draft_id}")
    start_time = time.time()

    # Retrieve the draft from database
    draft = get_draft(draft_id)
    if not draft:
        logger.error(f"[PIPELINE] Draft {draft_id} not found in database. Aborting.")
        return

    # Create a single aiohttp session for all Ollama API calls
    async with aiohttp.ClientSession() as session:
        try:
            # ================================================
            # PRE-STEP: Save all incoming images to disk
            # ================================================
            draft.pipeline_stage = "saving_images"
            draft.updated_at = datetime.utcnow()
            save_draft(draft)
            logger.info(f"[PIPELINE] Pre-step: Saving images to disk...")

            # We need to reconstruct image links from the draft
            # The draft stores processed_image_links which have saved paths
            # (This was already done in the submit endpoint before calling pipeline)
            processed_links = draft.processed_image_links

            total_images = sum(len(link.image_paths) for link in processed_links)
            if not processed_links:
                logger.warning(f"[PIPELINE] No processed image links found for draft {draft_id}")

            # ================================================
            # STEP A: Vision Model Analysis
            # ================================================
            if total_images > 0:
                draft.pipeline_stage = "vision_loading"
                draft.updated_at = datetime.utcnow()
                save_draft(draft)

                logger.info(f"\n{'='*50}")
                logger.info(f"[PIPELINE] STEP A: Vision Model Processing")
                logger.info(f"[PIPELINE] Model: {settings.nvidia_nim_model}")
                logger.info(f"{'='*50}")

                draft.pipeline_stage = f"vision_analyzing ({total_images} images)"
                draft.updated_at = datetime.utcnow()
                save_draft(draft)

                vision_summary = await run_vision_model(
                    session=session,
                    processed_image_links=processed_links,
                    raw_text=draft.raw_text
                )

                # Save the vision summary to draft
                draft.vision_summary = vision_summary
                draft.processed_image_links = processed_links  # Updated with descriptions
                draft.updated_at = datetime.utcnow()
                save_draft(draft)

                # (VRAM Management step removed)
            else:
                logger.info(f"[PIPELINE] No images to analyze, skipping vision model.")
                vision_summary = "No images were provided by the user."

            # ================================================
            # STEP C: Text Model Generation
            # ================================================
            draft.pipeline_stage = "text_loading"
            draft.updated_at = datetime.utcnow()
            save_draft(draft)

            logger.info(f"\n{'='*50}")
            logger.info(f"[PIPELINE] STEP C: Text Model Processing")
            logger.info(f"[PIPELINE] Model: {settings.nvidia_nim_model}")
            logger.info(f"{'='*50}")

            draft.pipeline_stage = "text_generating"
            draft.updated_at = datetime.utcnow()
            save_draft(draft)

            generated_text, suggested_images = await run_text_model(
                session=session,
                raw_text=draft.raw_text,
                tags=draft.tags,
                vision_summary=vision_summary,
                processed_image_links=processed_links,
                draft_id=draft_id
            )

            # (VRAM Management step removed)

            # ================================================
            # STEP E: Save Generated Draft
            # ================================================
            draft.pipeline_stage = "saving_draft"
            draft.updated_at = datetime.utcnow()
            save_draft(draft)

            logger.info(f"\n{'='*50}")
            logger.info(f"[PIPELINE] STEP E: Saving completed draft")
            logger.info(f"{'='*50}")

            draft.generated_post_text = generated_text
            draft.suggested_images = suggested_images
            draft.status = DraftStatus.AWAITING_APPROVAL
            draft.pipeline_stage = "complete"
            draft.updated_at = datetime.utcnow()
            save_draft(draft)

            elapsed = time.time() - start_time
            logger.info(
                f"[PIPELINE] ✅ Pipeline complete for draft {draft_id} "
                f"in {elapsed:.1f}s. Status: AWAITING_APPROVAL"
            )

            # Push preview to the MacBook frontend
            await push_preview_to_frontend(draft)

        except Exception as e:
            # If anything fails, mark the draft as failed
            logger.error(f"[PIPELINE] ❌ Pipeline failed for draft {draft_id}: {e}", exc_info=True)

            draft.status = DraftStatus.FAILED
            draft.pipeline_stage = "failed"
            draft.error_message = str(e)
            draft.updated_at = datetime.utcnow()
            save_draft(draft)

            logger.info("[PIPELINE] Pipeline failed.")


# ============================================================
# Rewrite AI Pipeline
# ============================================================

async def rewrite_ai_pipeline(draft_id: str, edited_text: str):
    """
    Takes an existing draft and rewrites it based on the user's edits.
    """
    logger.info(f"[{draft_id}] Starting REWRITE pipeline...")
    draft = get_draft(draft_id)
    if not draft:
        return

    try:
        draft.pipeline_stage = "text_generating"
        save_draft(draft)

        prompt = f"""You are an elite LinkedIn content creator.
The user reviewed your previous draft and made edits or provided feedback.
Your task is to produce a refined, polished version that incorporates their changes.

=== CURRENT DATE & TIME ===
Today is {datetime.now().strftime('%A, %B %d, %Y at %I:%M %p')}.

=== ORIGINAL RAW NOTES ===
{draft.raw_text}

=== VISION SUMMARY ===
{draft.vision_summary or 'No images attached.'}

=== USER'S EDITED DRAFT / FEEDBACK ===
{edited_text}

Rewrite the post so it is perfectly polished for LinkedIn.
Maintain the user's intent, tone, and any specific changes they made.
Do NOT add emojis unless the user used them. Do NOT start with clichés.
NEVER include image placeholders like IMAGE_0_0.
Output ONLY the final post text — no commentary."""

        async with aiohttp.ClientSession() as session:
            new_text = await call_nim_api(session, prompt, "text_generating", draft_id)

        draft.generated_post_text = new_text
        draft.status = DraftStatus.AWAITING_APPROVAL
        draft.pipeline_stage = "complete"
        draft.updated_at = datetime.utcnow()
        save_draft(draft)

        logger.info(f"[{draft_id}] Rewrite complete.")

        # Push preview to the MacBook frontend
        await push_preview_to_frontend(draft)

    except Exception as e:
        logger.error(f"[{draft_id}] Rewrite failed: {e}", exc_info=True)
        draft.status = DraftStatus.FAILED
        draft.pipeline_stage = "failed"
        draft.error_message = str(e)
        draft.updated_at = datetime.utcnow()
        save_draft(draft)


# ============================================================
# Preview Push to Frontend
# ============================================================

async def push_preview_to_frontend(draft: Draft):
    """
    After AI processing, proactively PUSH the draft preview to the MacBook.

    The MacBook frontend has a listener endpoint. We send the completed
    draft to it so the user gets an immediate notification.

    If the MacBook is offline, this silently fails - the draft is still
    accessible via GET /check-drafts when the Mac comes back online.
    """
    logger.info(f"[PUSH] Attempting to push draft {draft.id} preview to MacBook...")

    # Build the preview payload
    preview_payload = {
        "draft_id": draft.id,
        "status": draft.status.value,
        "generated_post_text": draft.generated_post_text,
        "tags": draft.tags,
        "suggested_images": draft.suggested_images,
        "vision_summary": draft.vision_summary,
        "created_at": draft.created_at.isoformat(),
        "approve_url": f"http://{settings.backend_ip}:{settings.backend_port}/approve-draft/{draft.id}",
        "reject_url": f"http://{settings.backend_ip}:{settings.backend_port}/reject-draft/{draft.id}",
        # Include image paths as relative URLs the frontend can fetch
        "image_urls": [
            f"http://{settings.backend_ip}:{settings.backend_port}/images/{Path(path).relative_to(settings.upload_dir).as_posix()}"
            for path in draft.suggested_images
        ]
    }

    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                settings.frontend_preview_url,
                json=preview_payload,
                timeout=aiohttp.ClientTimeout(total=10)  # Short timeout - Mac might be offline
            ) as response:
                if response.status == 200:
                    logger.info(f"[PUSH] ✅ Preview pushed to MacBook successfully.")
                else:
                    logger.warning(
                        f"[PUSH] MacBook returned unexpected status {response.status}. "
                        f"Draft is still available via /check-drafts."
                    )
    except aiohttp.ClientConnectorError:
        logger.info(
            f"[PUSH] MacBook appears to be offline (connection refused). "
            f"Draft {draft.id} is queued in /check-drafts for when it comes online."
        )
    except asyncio.TimeoutError:
        logger.info(
            f"[PUSH] Push to MacBook timed out. "
            f"Draft {draft.id} available via /check-drafts."
        )
    except Exception as e:
        logger.warning(f"[PUSH] Unexpected error pushing to MacBook: {e}")