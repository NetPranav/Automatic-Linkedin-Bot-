import asyncio
import re
from pathlib import Path
from playwright.async_api import async_playwright

STATE_FILE = "linkedin_state.json"

async def test_trigger():
    print(">> [TEST] Launching browser...")
    async with async_playwright() as p:
        state_path = Path(STATE_FILE)
        
        browser = await p.chromium.launch(headless=False, args=["--start-maximized"])
        context = await browser.new_context(
            storage_state=STATE_FILE if state_path.exists() else None,
            no_viewport=True
        )
        page = await context.new_page()
        
        print(">> [TEST] Navigating to LinkedIn feed with shareActive=true...")
        await page.goto("https://www.linkedin.com/feed/?shareActive=true", wait_until="domcontentloaded")
        await asyncio.sleep(5)
        
        # Check if modal opened automatically
        modal = page.locator("div[role='dialog']").filter(has_text=re.compile(r"Post", re.IGNORECASE)).first
        if await modal.is_visible(timeout=3000):
            print("  -> MODAL OPENED SUCCESSFULLY WITH URL HACK!")
        else:
            print("  -> Modal did not open automatically.")
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_trigger())
