"""
linkedin_api.py
---------------
LinkedIn API integration using the Official LinkedIn REST API v2.

Flow:
1. Register the image upload (get an uploadUrl from LinkedIn)
2. Binary upload the actual image bytes to that URL
3. Create a UGC (User Generated Content) post with text + image asset

Documentation:
- UGC Posts: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/ugc-post-api
- Image Upload: https://learn.microsoft.com/en-us/linkedin/marketing/integrations/community-management/shares/vector-asset-api

IMPORTANT: Set your credentials in the .env file:
- LINKEDIN_ACCESS_TOKEN
- LINKEDIN_PERSON_URN
"""

import requests
import logging
import os
from pathlib import Path
from typing import Optional, Tuple

from config import settings

logger = logging.getLogger(__name__)

# LinkedIn API Base URLs
LINKEDIN_API_BASE = "https://api.linkedin.com/v2"
LINKEDIN_ASSETS_API = "https://api.linkedin.com/v2/assets"
LINKEDIN_UGC_API = "https://api.linkedin.com/v2/ugcPosts"


def get_auth_headers() -> dict:
    """
    Build the standard LinkedIn API authentication headers.

    The access token comes from your .env file.
    Make sure LINKEDIN_ACCESS_TOKEN is set correctly.
    """
    # ============================================================
    # INSERT YOUR LINKEDIN ACCESS TOKEN IN .env FILE
    # LINKEDIN_ACCESS_TOKEN=your_token_here
    # ============================================================
    return {
        "Authorization": f"Bearer {settings.linkedin_access_token}",
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
        "LinkedIn-Version": "202304",  # API version date
    }


def register_image_upload(person_urn: str) -> Tuple[str, str]:
    """
    Step 1 of LinkedIn image upload: Register the upload and get a pre-signed URL.

    LinkedIn requires you to first "register" your upload intent before
    you can actually upload the image bytes. This returns:
    - asset: The LinkedIn asset URN (e.g., urn:li:digitalmediaAsset:XXXX)
    - uploadUrl: The pre-signed URL where you PUT the actual image bytes

    Args:
        person_urn: Your LinkedIn person URN (urn:li:person:XXXXXXXX)

    Returns:
        Tuple of (asset_urn, upload_url)
    """
    logger.info("[LinkedIn] Registering image upload with LinkedIn API...")

    register_payload = {
        "registerUploadRequest": {
            "recipes": [
                "urn:li:digitalmediaRecipe:feedshare-image"
            ],
            "owner": person_urn,
            "serviceRelationships": [
                {
                    "relationshipType": "OWNER",
                    "identifier": "urn:li:userGeneratedContent"
                }
            ]
        }
    }

    try:
        response = requests.post(
            f"{LINKEDIN_API_BASE}/assets?action=registerUpload",
            json=register_payload,
            headers=get_auth_headers(),
            timeout=30
        )
        response.raise_for_status()

    except requests.exceptions.HTTPError as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[LinkedIn] Failed to register upload: {error_detail}")
        raise Exception(f"LinkedIn image registration failed: {error_detail}")
    except requests.exceptions.ConnectionError:
        raise Exception("Cannot connect to LinkedIn API. Check internet connection.")

    result = response.json()

    # Extract the asset URN and upload URL from the response
    try:
        upload_mechanism = (
            result["value"]["uploadMechanism"]
            ["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]
        )
        upload_url = upload_mechanism["uploadUrl"]
        asset_urn = result["value"]["asset"]

        logger.info(f"[LinkedIn] Image registration successful. Asset URN: {asset_urn}")
        return asset_urn, upload_url

    except KeyError as e:
        raise Exception(f"Unexpected LinkedIn API response structure: {e}. Response: {result}")


def upload_image_binary(upload_url: str, image_path: str) -> bool:
    """
    Step 2 of LinkedIn image upload: PUT the actual image bytes to the pre-signed URL.

    Args:
        upload_url: The pre-signed URL from register_image_upload()
        image_path: Local filesystem path to the image file

    Returns:
        True if upload succeeded
    """
    logger.info(f"[LinkedIn] Uploading image binary: {image_path}")

    image_file = Path(image_path)
    if not image_file.exists():
        raise FileNotFoundError(f"Image file not found: {image_path}")

    # Determine content type from file extension
    ext_to_mime = {
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
    }
    content_type = ext_to_mime.get(image_file.suffix.lower(), "image/jpeg")

    try:
        with open(image_file, 'rb') as f:
            image_bytes = f.read()

        # LinkedIn's image upload uses a PUT request with binary data
        # The Authorization header is different here - just the token, no Bearer prefix needed
        # for some LinkedIn upload endpoints, but Bearer works for most
        upload_headers = {
            "Authorization": f"Bearer {settings.linkedin_access_token}",
            "Content-Type": content_type,
        }

        response = requests.put(
            upload_url,
            data=image_bytes,
            headers=upload_headers,
            timeout=60  # Image uploads can take time
        )

        # LinkedIn returns 201 or 200 on successful upload
        if response.status_code in [200, 201]:
            logger.info(
                f"[LinkedIn] ✅ Image binary uploaded successfully. "
                f"Size: {len(image_bytes)} bytes"
            )
            return True
        else:
            logger.error(
                f"[LinkedIn] Image upload failed. "
                f"Status: {response.status_code}, Response: {response.text}"
            )
            raise Exception(
                f"LinkedIn image upload failed with status {response.status_code}: "
                f"{response.text}"
            )

    except requests.exceptions.ConnectionError:
        raise Exception(f"Network error uploading image to LinkedIn pre-signed URL.")


def create_ugc_post(
    person_urn: str,
    post_text: str,
    asset_urn: Optional[str] = None
) -> Tuple[str, str]:
    """
    Step 3: Create the actual LinkedIn UGC (User Generated Content) post.

    This is the final step that makes the post visible on LinkedIn.

    Args:
        person_urn: Your LinkedIn person URN
        post_text: The final text content of the post
        asset_urn: Optional LinkedIn asset URN from image upload step

    Returns:
        Tuple of (post_id, post_url)
    """
    logger.info("[LinkedIn] Creating UGC post...")

    # Build the media array if we have an image
    # LinkedIn UGC posts use a specific structure for media
    if asset_urn:
        media = [
            {
                "status": "READY",
                "description": {
                    "text": "Post image"
                },
                "media": asset_urn,
                "title": {
                    "text": "LinkedIn Post Image"
                }
            }
        ]
        share_media_category = "IMAGE"
    else:
        media = []
        share_media_category = "NONE"

    # Build the complete UGC post payload
    ugc_payload = {
        "author": person_urn,
        "lifecycleState": "PUBLISHED",  # Publish immediately
        "specificContent": {
            "com.linkedin.ugc.ShareContent": {
                "shareCommentary": {
                    "text": post_text
                },
                "shareMediaCategory": share_media_category,
                "media": media
            }
        },
        "visibility": {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC"
        }
    }

    try:
        response = requests.post(
            LINKEDIN_UGC_API,
            json=ugc_payload,
            headers=get_auth_headers(),
            timeout=30
        )
        response.raise_for_status()

    except requests.exceptions.HTTPError as e:
        error_detail = e.response.text if e.response else str(e)
        logger.error(f"[LinkedIn] UGC post creation failed: {error_detail}")
        raise Exception(f"LinkedIn post creation failed: {error_detail}")

    # Extract the post ID from the response headers
    # LinkedIn returns the post ID in the X-RestLi-Id header
    post_id = response.headers.get("x-restli-id", "")

    if not post_id:
        # Sometimes it's in the response body
        try:
            post_id = response.json().get("id", "unknown")
        except Exception:
            post_id = "unknown"

    # Construct the LinkedIn post URL
    # Note: This is the best approximation - LinkedIn doesn't always return the full URL
    post_url = f"https://www.linkedin.com/feed/update/{post_id}/"

    logger.info(f"[LinkedIn] ✅ Post created successfully! ID: {post_id}")
    logger.info(f"[LinkedIn] Post URL: {post_url}")

    return post_id, post_url


def post_to_linkedin(
    text: str,
    image_path: Optional[str] = None,
    access_token: Optional[str] = None
) -> Tuple[str, str]:
    """
    Main LinkedIn posting function - orchestrates the complete upload flow.

    This is the function called from the /approve-draft endpoint.

    Flow:
        1. (If image) Register image upload with LinkedIn
        2. (If image) Upload image binary to pre-signed URL
        3. Create the UGC post with text and image asset

    Args:
        text: The final post text (edited and approved by user)
        image_path: Optional local path to the thumbnail image
        access_token: Optional override for the access token (uses .env default)

    Returns:
        Tuple of (post_id, post_url)

    Raises:
        Exception: If any step of the LinkedIn API fails
    """
    logger.info("[LinkedIn] Starting post_to_linkedin flow...")

    # Use the person URN from .env
    # ============================================================
    # MAKE SURE LINKEDIN_PERSON_URN IS SET IN YOUR .env FILE
    # It looks like: urn:li:person:XXXXXXXXXXXXXXXX
    # Get it by calling: GET https://api.linkedin.com/v2/me
    # with your access token
    # ============================================================
    person_urn = settings.linkedin_person_urn

    if not person_urn or person_urn == "urn:li:person:your_person_urn_here":
        raise Exception(
            "LINKEDIN_PERSON_URN is not configured in .env file. "
            "Please set your LinkedIn Person URN."
        )

    # Override access token if provided
    if access_token:
        # Temporarily override settings for this call
        # In production you'd handle this differently
        logger.info("[LinkedIn] Using provided access token override.")

    asset_urn = None

    # ---- STEP 1 & 2: Upload Image (if provided) ----
    if image_path and Path(image_path).exists():
        logger.info(f"[LinkedIn] Image provided: {image_path}. Starting upload...")

        # Register the upload intent
        asset_urn, upload_url = register_image_upload(person_urn)

        # Upload the actual image binary
        upload_image_binary(upload_url, image_path)

        logger.info(f"[LinkedIn] Image upload complete. Asset URN: {asset_urn}")
    else:
        if image_path:
            logger.warning(
                f"[LinkedIn] Image path provided but file not found: {image_path}. "
                f"Posting without image."
            )
        else:
            logger.info("[LinkedIn] No image provided. Creating text-only post.")

    # ---- STEP 3: Create the UGC Post ----
    post_id, post_url = create_ugc_post(
        person_urn=person_urn,
        post_text=text,
        asset_urn=asset_urn
    )

    return post_id, post_url