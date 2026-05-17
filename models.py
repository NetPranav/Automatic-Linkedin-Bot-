"""
models.py
---------
All Pydantic models for request/response validation.
These models match EXACTLY what the Tauri/Next.js frontend sends.
"""

from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


# ============================================================
# Enums
# ============================================================

class DraftStatus(str, Enum):
    """Tracks the lifecycle of a post through the system."""
    PROCESSING = "processing"           # AI pipeline is running
    AWAITING_APPROVAL = "awaiting_approval"  # Draft ready, waiting for user
    APPROVED = "approved"               # User approved, posting to LinkedIn
    POSTED = "posted"                   # Successfully posted to LinkedIn
    REJECTED = "rejected"               # User rejected the draft
    FAILED = "failed"                   # Something went wrong


# ============================================================
# Incoming Request Models (from Frontend Widget)
# ============================================================

class ImageLink(BaseModel):
    """
    Represents the contextual mapping between a piece of text
    and the images the user attached to that specific text.

    This is the core data structure from the frontend widget.
    The startIndex and endIndex tell us EXACTLY which sentence
    the images belong to within the post.
    """
    text: str = Field(..., description="The highlighted text snippet")
    startIndex: int = Field(..., description="Character start index in the full text")
    endIndex: int = Field(..., description="Character end index in the full text")
    images: List[str] = Field(
        default_factory=list,
        description="Base64 Data URI strings (e.g., data:image/jpeg;base64,...)"
    )


class SubmitRawRequest(BaseModel):
    """
    Exact schema of the JSON payload sent by the Tauri frontend widget.

    The frontend sends this when user clicks 'Queue for AI'.
    Maps to POST /submit-raw endpoint.
    """
    text: str = Field(..., description="Raw text of the LinkedIn post draft")
    tags: List[str] = Field(
        default_factory=list,
        description="Hashtags WITHOUT the # symbol"
    )
    imageLinks: List[ImageLink] = Field(
        default_factory=list,
        description="Contextual image-to-text mappings"
    )
    timestamp: str = Field(..., description="ISO 8601 timestamp from frontend")


# ============================================================
# Approval Models (from MacBook Preview Frontend)
# ============================================================

class ApproveRequest(BaseModel):
    """
    Sent by the MacBook frontend when user approves a draft.
    They can optionally edit the text before approving.
    """
    final_text: str = Field(..., description="Final edited post text")
    selected_image_paths: Optional[List[str]] = Field(
        default=None,
        description="Which images to include in the LinkedIn post"
    )


class RejectRequest(BaseModel):
    """Sent when user rejects a draft, with optional feedback."""
    feedback: Optional[str] = Field(
        default=None,
        description="Optional feedback on why it was rejected"
    )

class RewriteRequest(BaseModel):
    """Sent when user modifies the draft text and wants the AI to rewrite it."""
    edited_text: str = Field(..., description="The user's modified draft text")


# ============================================================
# Internal Data Models (stored in database)
# ============================================================

class ImageLinkProcessed(BaseModel):
    """ImageLink after processing - images saved to disk."""
    text: str
    startIndex: int
    endIndex: int
    image_paths: List[str] = Field(
        default_factory=list,
        description="Local filesystem paths to saved images"
    )
    vision_descriptions: List[str] = Field(
        default_factory=list,
        description="AI-generated descriptions of each image"
    )


class Draft(BaseModel):
    """
    Complete draft object stored internally.
    Tracks everything from raw submission to final posting.
    """
    id: str
    status: DraftStatus
    created_at: datetime
    updated_at: datetime

    # Original submission data
    raw_text: str
    tags: List[str]
    original_timestamp: str

    # Processed image data
    processed_image_links: List[ImageLinkProcessed] = Field(default_factory=list)

    # Pipeline progress tracking (for live frontend status)
    pipeline_stage: Optional[str] = None       # Current step: e.g. "vision_loading", "text_generating"
    current_generation: Optional[str] = None   # Live streaming text from the model

    # AI generated content
    vision_summary: Optional[str] = None       # Combined vision model output
    generated_post_text: Optional[str] = None  # Final AI-generated post
    suggested_images: List[str] = Field(
        default_factory=list,
        description="Paths of images AI selected for thumbnail"
    )

    # LinkedIn posting data
    final_approved_text: Optional[str] = None
    linkedin_post_id: Optional[str] = None
    linkedin_post_url: Optional[str] = None
    error_message: Optional[str] = None

    # Feedback
    rejection_feedback: Optional[str] = None


# ============================================================
# Response Models (sent back to frontends)
# ============================================================

class SubmitResponse(BaseModel):
    """Response to the frontend after submitting raw content."""
    draft_id: str
    status: str
    message: str
    estimated_processing_time_seconds: int


class DraftPreview(BaseModel):
    """
    The draft preview sent to the MacBook for approval.
    Contains everything the user needs to make a decision.
    """
    id: str
    status: str
    generated_post_text: str
    tags: List[str]
    suggested_images: List[str]
    vision_summary: str
    created_at: str


class CheckDraftsResponse(BaseModel):
    """Response to GET /check-drafts."""
    pending_count: int
    drafts: List[DraftPreview]


class PostApprovedResponse(BaseModel):
    """Response after successfully posting to LinkedIn."""
    draft_id: str
    linkedin_post_id: str
    linkedin_post_url: str
    message: str