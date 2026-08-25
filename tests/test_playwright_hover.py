"""
test_playwright_hover.py
------------------------
This is a test script that uses Playwright (instead of PyAutoGUI) to open LinkedIn,
click 'Start a post', write something, and then bring the mouse to the 'Post' button
(hover) without clicking it.
"""
import asyncio
from playwright.async_api import async_playwright
from pathlib import Path

# File to store session cookies (created by linkedin_poster.py)
STATE_FILE = "linkedin_state.json"

async def test_hover_post():
    print(">> [TEST] Launching Playwright in headed mode (so you can see it)...")
    async with async_playwright() as p:
        state_path = Path(STATE_FILE)
        has_state = state_path.exists()

        # Launch headed so user can see it
        browser = await p.chromium.launch(headless=False)
        context = await browser.new_context(
            storage_state=STATE_FILE if has_state else None,
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 720}
        )
        page = await context.new_page()

        print(">> [TEST] Navigating to LinkedIn feed...")
        await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        await asyncio.sleep(3)

        # Basic login check
        is_logged_in = "/feed" in page.url and "login" not in page.url
        if not is_logged_in:
            print(">> [TEST] Not logged in via saved session.")
            print(">> Please run 'python linkedin_poster.py' once to auto-login, or login manually if needed.")
            await browser.close()
            return
            
        print(">> [TEST] Clicking 'Start a post'...")
        try:
            await page.locator(".share-box-feed-entry__trigger").first.click(timeout=5000)
        except:
            print(">> [TEST] Primary selector failed, trying fallback locators...")
            await page.locator('button:has-text("Start a post"), div[role="button"]:has-text("Start a post"), span:has-text("Start a post"), button:has-text("Create a post")').first.click(timeout=5000)

        # Wait for modal to appear
        modal = page.locator(".share-box-v2__modal, div[role='dialog']").filter(has_text="Post").first
        await modal.wait_for(state="visible")
        await asyncio.sleep(1)

        print(">> [TEST] Typing post content...")
        # Dynamically wait for the text area
        editor = page.locator(".ql-editor, div[role='textbox'], .share-document-editor__contenteditable").first
        
        # Wait up to 30 seconds for it to become visible and interactable
        await editor.wait_for(state="visible", timeout=30000)
        await editor.click(timeout=10000)
        
        await page.keyboard.insert_text("This is a test post from Playwright. Hovering over the post button but NOT clicking it!")
        await asyncio.sleep(2)

        print(">> [TEST] Testing 'Add media' button locator...")
        try:
            add_media_btn = page.locator("button[aria-label*='media' i], button[aria-label*='photo' i], button[aria-label*='image' i], button[aria-label*='Media' i], button[aria-label*='Photo' i]").first
            await add_media_btn.wait_for(state="visible", timeout=10000)
            await add_media_btn.hover()
            print(">> [TEST] Successfully found and hovered 'Add media' button!")
        except Exception as e:
            print(f">> [TEST ERROR] Failed to find 'Add media' button: {e}")

        print(">> [TEST] Bringing mouse to 'Post' button (hovering)...")
        import re
        post_btn = modal.locator("button").filter(has_text=re.compile(r"^Post$")).first
        
        # Hovering over the button (this simulates moving the mouse over the element)
        await post_btn.hover()
        
        print(">> [TEST] Hover successful! You should see the Post button highlighted/hovered.")
        print(">> [TEST] Not clicking. Waiting 10 seconds before closing so you can see it.")
        await asyncio.sleep(10)
        
        await browser.close()
        print(">> [TEST] Browser closed. Test complete.")

if __name__ == "__main__":
    asyncio.run(test_hover_post())
