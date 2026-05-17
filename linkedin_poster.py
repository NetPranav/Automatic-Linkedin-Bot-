"""
linkedin_poster.py
------------------
LinkedIn Auto-Poster using Playwright.
Runs completely silently in the background (headless).
"""

import time
import logging
from typing import List
from pathlib import Path
from playwright.sync_api import sync_playwright

logger = logging.getLogger(__name__)

# File to store session cookies so you don't have to login every time
STATE_FILE = "linkedin_state.json"

def auto_post_to_linkedin(title: str, description: str, image_paths: List[str]):
    """
    Automates posting to LinkedIn silently using Playwright.
    """
    full_text = f"{title}\n\n{description}" if title else description
    
    with sync_playwright() as p:
        state_path = Path(STATE_FILE)
        has_state = state_path.exists()
        
        # If we have no state, we must run headful (visible) ONCE so the user can log in
        headless_mode = has_state
        
        logger.info(f"Launching Playwright (Headless: {headless_mode})...")
        
        browser = p.chromium.launch(headless=headless_mode)
        
        context = browser.new_context(
            storage_state=STATE_FILE if has_state else None,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        )
        page = context.new_page()
        
        logger.info("Navigating to LinkedIn feed...")
        print(">> [PLAYWRIGHT] Navigating to LinkedIn feed...")
        page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        
        # Check if we are actually logged in by looking for the profile photo in the nav bar
        try:
            page.wait_for_selector(".global-nav__me-photo", state="visible", timeout=5000)
            is_logged_in = True
            print(">> [PLAYWRIGHT] Successfully verified LinkedIn login status.")
        except:
            is_logged_in = False
            print(">> [PLAYWRIGHT] Profile not detected. User needs to log in.")
            
        if not is_logged_in:
            if headless_mode:
                logger.error("Session expired or invalid! Please delete 'linkedin_state.json' and restart the backend to login again.")
                print(">> [PLAYWRIGHT ERROR] Session expired! Please delete linkedin_state.json and restart.")
                browser.close()
                return False, "Session expired"
                
            logger.info("=====================================================")
            logger.info("PLEASE LOG IN TO LINKEDIN IN THE OPEN BROWSER WINDOW")
            logger.info("The script will wait until it detects the feed...")
            logger.info("=====================================================")
            print("\n" + "="*60)
            print(">> [PLAYWRIGHT] MANUAL LOGIN REQUIRED")
            print(">> Please log in using the Chrome window that just opened.")
            print(">> I will wait here until you successfully log in...")
            print("=====================================================\n")
            
            # Wait for the feed page to load and profile photo to appear (login success)
            page.wait_for_selector(".global-nav__me-photo", state="visible", timeout=300000) # 5 minutes
            
            # Save the state for future headless runs
            context.storage_state(path=STATE_FILE)
            logger.info("✅ Login successful! Session saved to 'linkedin_state.json'.")
            print(">> [PLAYWRIGHT] ✅ Login successful! Session saved for future silent runs.")
        
        logger.info("Starting LinkedIn post...")
        print(">> [PLAYWRIGHT] Starting to draft LinkedIn post...")
        
        try:
            # 1. Click "Start a post"
            print(">> [PLAYWRIGHT] Clicking 'Start a post'...")
            try:
                page.locator(".share-box-feed-entry__trigger").first.click(timeout=5000)
            except:
                page.locator("button:has-text('Start a post'), button:has-text('Create a post')").first.click()
            
            # Wait for modal to appear
            modal = page.locator("div[role='dialog']")
            modal.wait_for(state="visible")
            time.sleep(1) # Extra stability wait
            
            # 2. Type text
            logger.info("Entering text...")
            print(">> [PLAYWRIGHT] Typing post content...")
            editor = page.locator(".ql-editor").first
            editor.click()
            
            # Use keyboard insertion to perfectly mimic typing/pasting
            page.keyboard.insert_text(full_text)
            time.sleep(1)
            
            # 3. Upload images if any
            if image_paths:
                logger.info(f"Uploading {len(image_paths)} images...")
                print(f">> [PLAYWRIGHT] Uploading {len(image_paths)} images...")
                
                with page.expect_file_chooser() as fc_info:
                    # Click the "Add media" icon
                    page.locator("button[aria-label='Add media'], button[aria-label='Add a photo']").first.click()
                    
                file_chooser = fc_info.value
                file_chooser.set_files(image_paths)
                
                # Wait for image editor modal, then click "Next"
                print(">> [PLAYWRIGHT] Processing images...")
                next_btn = page.locator("button:has-text('Next')").first
                next_btn.wait_for(state="visible")
                time.sleep(1)
                next_btn.click()
                time.sleep(1)
                
            # 4. Click Post
            logger.info("Clicking Post button...")
            print(">> [PLAYWRIGHT] Clicking final 'Post' button...")
            post_btn = modal.locator("button:has-text('Post'), span:has-text('Post')").first
            post_btn.click()
            
            # Wait for the modal to close indicating success
            print(">> [PLAYWRIGHT] Waiting for post to publish...")
            modal.wait_for(state="hidden", timeout=15000)
            
            logger.info("✅ POST AUTOMATION COMPLETE")
            print(">> [PLAYWRIGHT] ✅ Successfully posted to LinkedIn!")
            time.sleep(2)
            
            browser.close()
            return True, "Success"
            
        except Exception as e:
            logger.error(f"Playwright automation failed: {e}")
            print(f">> [PLAYWRIGHT ERROR] Unable to move forward! Automation failed: {e}")
            # Take screenshot for debugging
            try:
                page.screenshot(path="playwright_error.png")
            except:
                pass
            browser.close()
            return False, str(e)

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Testing Playwright integration...")
    # This will trigger the login flow on first run
    auto_post_to_linkedin("Test Title", "Test description from Playwright headless!", [])
