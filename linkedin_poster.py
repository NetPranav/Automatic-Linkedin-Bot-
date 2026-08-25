"""
linkedin_poster.py
------------------
LinkedIn Auto-Poster using Playwright.
Runs completely silently in the background (headless).
Auto-logs in using credentials from .env if no saved session exists.
"""

import asyncio
import logging
from typing import List
from pathlib import Path
from playwright.async_api import async_playwright
from config import settings

logger = logging.getLogger(__name__)

# File to store session cookies so you don't have to login every time
STATE_FILE = "linkedin_state.json"

async def _attempt_login(page, context):
    """
    Fills in LinkedIn email/password from .env and submits.
    Returns True if login succeeded, False otherwise.
    """
    # Try config first, fallback to reading .env directly
    import os
    try:
        from dotenv import load_dotenv
        load_dotenv(override=True)
    except ImportError:
        pass

    email = os.environ.get("LINKEDIN_EMAIL", "") or getattr(settings, "linkedin_email", "")
    password = os.environ.get("LINKEDIN_PASSWORD", "") or getattr(settings, "linkedin_password", "")

    if not email or not password or "your_" in email:
        print(">> [PLAYWRIGHT ERROR] LinkedIn credentials not set in .env!")
        print(">> Please set LINKEDIN_EMAIL and LINKEDIN_PASSWORD in your .env file.")
        print(f">> (Debug: email loaded = '{email[:3]}***' )" if email else ">> (Debug: email is EMPTY)")
        return False

    print(f">> [PLAYWRIGHT] Auto-logging in as {email}...")

    try:
        # Navigate to the login page
        await page.goto("https://www.linkedin.com/login", wait_until="domcontentloaded")
        await asyncio.sleep(2)

        # Fill email
        email_field = page.locator("#username")
        await email_field.wait_for(state="visible", timeout=10000)
        await email_field.fill(email)

        # Fill password
        password_field = page.locator("#password")
        await password_field.fill(password)

        # Click sign in
        await page.locator("button[type='submit']").click()
        print(">> [PLAYWRIGHT] Credentials submitted, waiting for feed...")

        # Wait for feed to load (means login worked)
        await page.wait_for_url("**/feed/**", timeout=30000)
        await asyncio.sleep(2)

        # Verify we're actually on the feed
        if "/feed" in page.url:
            await context.storage_state(path=STATE_FILE)
            print(">> [PLAYWRIGHT] Auto-login successful! Session saved.")
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
            await page.screenshot(path="login_error.png")
        except:
            pass
        return False

async def auto_post_to_linkedin(title: str, description: str, image_paths: List[str]):
    """
    Automates posting to LinkedIn silently using Playwright.
    """
    full_text = f"{title}\n\n{description}" if title else description

    async with async_playwright() as p:
        state_path = Path(STATE_FILE)
        has_state = state_path.exists()

        print(f">> [PLAYWRIGHT] Launching browser (Headless: False)...")
        # Added args to disable automation indicators and infobars
        browser = await p.chromium.launch(
            headless=False,
            args=[
                "--disable-blink-features=AutomationControlled",
                "--start-maximized"
            ]
        )

        context = await browser.new_context(
            storage_state=STATE_FILE if has_state else None,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            no_viewport=True # Lets the maximized window dictate the viewport size
        )
        
        # Avoid webdriver detection via an evaluation script
        page = await context.new_page()
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")

        print(">> [PLAYWRIGHT] Navigating to LinkedIn feed...")
        # Use shareActive=true to tell LinkedIn to automatically open the "Start a post" modal
        await page.goto("https://www.linkedin.com/feed/?shareActive=true", wait_until="domcontentloaded")
        await asyncio.sleep(4)

        is_logged_in = "/feed" in page.url and "login" not in page.url

        if not is_logged_in:
            print(">> [PLAYWRIGHT] Not logged in. Attempting auto-login...")
            if has_state:
                state_path.unlink(missing_ok=True)
            login_ok = await _attempt_login(page, context)
            if not login_ok:
                await browser.close()
                return False, "Login failed."
                
            # After login, navigate again to trigger the modal
            print(">> [PLAYWRIGHT] Triggering post modal via URL...")
            await page.goto("https://www.linkedin.com/feed/?shareActive=true", wait_until="domcontentloaded")
            await asyncio.sleep(4)
        else:
            print(">> [PLAYWRIGHT] Already logged in via saved session.")

        # ── Step 2: Create the post ──
        print(">> [PLAYWRIGHT] Starting to draft LinkedIn post...")

        try:
            await page.bring_to_front()
            
            # Human simulation
            import random
            await page.mouse.wheel(0, 400)
            await asyncio.sleep(random.uniform(0.5, 1.0))
            await page.mouse.wheel(0, -400)
            await asyncio.sleep(1)

            # --- HARDENED MODAL DETECTION ---
            print(">> [PLAYWRIGHT] Waiting for modal popup (triggered automatically via URL)...")
            
            # Instead of guessing which dialog is the correct one (LinkedIn has hidden video error dialogs),
            # we globally wait for the actual text editor to become visible first.
            editor = page.locator("div[role='textbox']:visible, .ql-editor:visible").first
            await editor.wait_for(state="visible", timeout=20000)
            
            # Now we know the active modal is the one containing the textbox
            modal = page.locator("div[role='dialog']:visible").filter(has=page.locator("div[role='textbox']")).first
            
            # Wait an extra brief second for animations to complete before typing
            await asyncio.sleep(1.5) 

            # --- HARDENED EDITOR INTERACTION ---
            print(">> [PLAYWRIGHT] Focusing text editor...")
            # Click directly into the middle of the text editor box to focus it
            await editor.click()
            await asyncio.sleep(0.5)

            print(">> [PLAYWRIGHT] Typing post content safely...")
            # Slower typing pace (50ms) to ensure LinkedIn's internal state managers keep up
            await page.keyboard.type(full_text, delay=50)
            await asyncio.sleep(1.5)

            # Upload images
            if image_paths:
                print(f">> [PLAYWRIGHT] Uploading {len(image_paths)} images...")
                async with page.expect_file_chooser(timeout=10000) as fc_info:
                    await modal.locator("button[aria-label*='media' i], button[aria-label*='photo' i]").first.click()

                file_chooser = await fc_info.value
                await file_chooser.set_files(image_paths)

                print(">> [PLAYWRIGHT] Processing images...")
                next_btn = page.locator("button:has-text('Next'):visible, button:has-text('Done'):visible").first
                await next_btn.wait_for(state="visible", timeout=10000)
                await next_btn.click()
                await asyncio.sleep(1.5)

            # Click Post
            print(">> [PLAYWRIGHT] Clicking final 'Post' button...")
            post_btn = page.locator("button:has-text('Post'):visible, .share-actions__primary-action:visible").last
            
            await post_btn.wait_for(state="visible", timeout=15000)
            await post_btn.click(delay=100)

            print(">> [PLAYWRIGHT] Waiting for post to publish...")
            await modal.wait_for(state="hidden", timeout=30000)

            print(">> [PLAYWRIGHT] Successfully posted to LinkedIn!")
            await asyncio.sleep(2)

            await context.storage_state(path=STATE_FILE)
            await browser.close()
            return True, "Success"

        except Exception as e:
            print(f">> [PLAYWRIGHT ERROR] Automation failed: {e}")
            try:
                await page.screenshot(path="playwright_crash_debug.png")
                print(">> [PLAYWRIGHT] Debug screenshot saved to 'playwright_crash_debug.png'")
            except:
                pass
            await browser.close()
            return False, str(e)