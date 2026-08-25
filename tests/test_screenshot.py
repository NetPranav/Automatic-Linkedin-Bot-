import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

STATE_FILE = "linkedin_state.json"

async def test_screenshot():
    print(">> [TEST] Launching browser...")
    async with async_playwright() as p:
        state_path = Path(STATE_FILE)
        
        browser = await p.chromium.launch(headless=False, args=["--start-maximized"])
        context = await browser.new_context(
            storage_state=STATE_FILE if state_path.exists() else None,
            no_viewport=True
        )
        page = await context.new_page()
        
        print(">> [TEST] Navigating to LinkedIn feed...")
        await page.goto("https://www.linkedin.com/feed/", wait_until="domcontentloaded")
        await asyncio.sleep(5)
        
        await page.screenshot(path="feed_debug.png", full_page=True)
        print(">> [TEST] Saved feed_debug.png")
        
        # Also dump the body HTML
        html = await page.content()
        with open("feed_html.txt", "w", encoding="utf-8") as f:
            f.write(html)
            
        await browser.close()

if __name__ == "__main__":
    asyncio.run(test_screenshot())
