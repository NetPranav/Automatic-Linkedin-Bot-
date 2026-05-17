"""
linkedin_poster.py
------------------
LinkedIn Auto-Poster using Playwright.
Runs completely silently in the background (headless).
Auto-logs in using credentials from .env if no saved session exists.
"""

import time
import logging
from typing import List
from pathlib import Path
from playwright.sync_api import sync_playwright
from config import settings

logger = logging.getLogger(__name__)

# File to store session cookies so you don't have to login every time
STATE_FILE = "linkedin_state.json"

def _attempt_login(page, context):
    """
    Fills in LinkedIn email/password from .env and submits.
    Returns True if login succeeded, False otherwise.
    """
    email = settings.linkedin_email
    password = settings.linkedin_password

    if not email or not password or "your_" in email:
        print(">> [PLAYWRIGHT ERROR] LinkedIn credentials not set in .env!")
        print(">> Please set LINKEDIN_EMAIL and LINKEDIN_PASSWORD in your .env file.")
        return False

    print(f">> [PLAYWRIGHT] Auto-logging in as {email}...")

    try:
        # Navigate to the login page
        page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded")
        time.sleep(2)

        # Fill email
        email_field = page.locator("#username")
        email_field.wait_for(state="visible", timeout=10000)
        email_field.fill(email)

        # Fill password
        password_field = page.locator("#password")
        password_field.fill(password)

        # Click sign in
        page.locator("button[type='submit']").click()
        print(">> [PLAYWRIGHT] Credentials submitted, waiting for feed...")

        # Wait for feed to load (means login worked)
        page.wait_for_url("**/feed/**", timeout=30000)
        time.sleep(2)

        # Verify we're actually on the feed
        if "/feed" in page.url:
            context.storage_state(path=STATE_FILE)
            print(">> [PLAYWRIGHT] ✅ Auto-login successful! Session saved.")
            return True
        else:
            print(f">> [PLAYWRIGHT ERROR] Landed on unexpected page: {page.url}")
            return False

    except Exception as e:
        print(f">> [PLAYWRIGHT ERROR] Auto-login failed: {e}")
        # Check if it's a security challenge
        if "checkpoint" in page.url:
            print(">> [PLAYWRIGHT] LinkedIn security challenge detected.")
            print(">> You may need to verify your identity on LinkedIn first.")
        try:
            page.screenshot(path="login_error.png")
        except:
            pass
        return False


def auto_post_to_linkedin(title: str, description: str, image_paths: List[str]):
    """
    Automates posting to LinkedIn silently using Playwright.
    """
    full_text = f"{title}\n\n{description}" if title else description

    with sync_playwright() as p:
        state_path = Path(STATE_FILE)
        has_state = state_path.exists()

        # Always launch headless - no more visible browser windows
        print(f">> [PLAYWRIGHT] Launching browser (Headless: True)...")
        browser = p.chromium.launch(headless=True)

        context = browser.new_context(
            storage_state=STATE_FILE if has_state else None,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()

        # ── Step 1: Check if logged in or need to login ──
        print(">> [PLAYWRIGHT] Navigating to LinkedIn feed...")
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        time.sleep(3)

        # Check if we ended up on login page
        is_logged_in = "/feed" in page.url and "login" not in page.url

        if not is_logged_in:
            print(">> [PLAYWRIGHT] Not logged in. Attempting auto-login...")

            # Delete old invalid state if it exists
            if has_state:
                state_path.unlink(missing_ok=True)
                print(">> [PLAYWRIGHT] Removed expired session file.")

            login_ok = _attempt_login(page, context)
            if not login_ok:
                browser.close()
                return False, "Login failed. Check LINKEDIN_EMAIL and LINKEDIN_PASSWORD in .env"
        else:
            print(">> [PLAYWRIGHT] ✅ Already logged in via saved session.")

        # ── Step 2: Create the post ──
        print(">> [PLAYWRIGHT] Starting to draft LinkedIn post...")

        try:
            # Click "Start a post"
            print(">> [PLAYWRIGHT] Clicking 'Start a post'...")
            try:
                page.locator(".share-box-feed-entry__trigger").first.click(timeout=5000)
            except:
                page.locator("button:has-text('Start a post'), button:has-text('Create a post')").first.click()

            # Wait for modal
            modal = page.locator("div[role='dialog']")
            modal.wait_for(state="visible")
            time.sleep(1)

            # Type text
            print(">> [PLAYWRIGHT] Typing post content...")
            editor = page.locator(".ql-editor").first
            editor.click()
            page.keyboard.insert_text(full_text)
            time.sleep(1)

            # Upload images
            if image_paths:
                print(f">> [PLAYWRIGHT] Uploading {len(image_paths)} images...")

                with page.expect_file_chooser() as fc_info:
                    page.locator("button[aria-label='Add media'], button[aria-label='Add a photo']").first.click()

                file_chooser = fc_info.value
                file_chooser.set_files(image_paths)

                print(">> [PLAYWRIGHT] Processing images...")
                next_btn = page.locator("button:has-text('Next')").first
                next_btn.wait_for(state="visible")
                time.sleep(1)
                next_btn.click()
                time.sleep(1)

            # Click Post
            print(">> [PLAYWRIGHT] Clicking final 'Post' button...")
            post_btn = modal.locator("button:has-text('Post'), span:has-text('Post')").first
            post_btn.click()

            print(">> [PLAYWRIGHT] Waiting for post to publish...")
            modal.wait_for(state="hidden", timeout=15000)

            logger.info("✅ POST AUTOMATION COMPLETE")
            print(">> [PLAYWRIGHT] ✅ Successfully posted to LinkedIn!")
            time.sleep(2)

            # Re-save state after successful post (keeps session fresh)
            context.storage_state(path=STATE_FILE)

            browser.close()
            return True, "Success"

        except Exception as e:
            logger.error(f"Playwright automation failed: {e}")
            print(f">> [PLAYWRIGHT ERROR] Unable to move forward! Automation failed: {e}")
            try:
                page.screenshot(path="playwright_error.png")
            except:
                pass
            browser.close()
            return False, str(e)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Testing Playwright integration...")
    auto_post_to_linkedin("Test Title", "Test description from Playwright headless!", [])
