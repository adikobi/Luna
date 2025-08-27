import asyncio
import os
from playwright.async_api import async_playwright, expect

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        page = await browser.new_page()

        # Mock data to be injected
        mock_people_data = [
            {
                "id": 1,
                "name": "Alex",
                "image": "",
                "moments": [
                    {"id": 101, "date": "2023-10-26", "text": "This is the first moment.", "tags": ["test", "alpha"]},
                    {"id": 102, "date": "2023-10-27", "text": "This is a second moment with a search term.", "tags": ["test", "beta"]}
                ]
            }
        ]

        await page.goto(f"file://{os.path.abspath('index.html')}")

        # Wait for splash screen to disappear
        await page.wait_for_selector('#splash-screen', state='hidden', timeout=5000)

        # Manually make the app container visible
        await page.evaluate("document.getElementById('app-container').style.display = 'block'")

        # Inject data and render the app by calling startApp directly
        await page.evaluate(f"""
            const db = firebase.firestore();
            const user = {{ uid: 'test-uid' }};
            window.allPeople = {mock_people_data};
            startApp(user, db);
        """)

        # --- 1. Verify Moment Styling on Detail Page ---
        await page.wait_for_selector('.person-card', timeout=5000)
        await page.click('.person-card')
        await expect(page.locator('.moments-list')).to_be_visible()

        # Check date color and card style
        moment_date = page.locator('.moment-date').first
        await expect(moment_date).to_have_css('color', 'rgb(249, 226, 175)') # --accent-yellow

        moment_item = page.locator('.moment-item').first
        await expect(moment_item).to_have_css('border-left-color', 'rgb(167, 215, 197)') # --accent-green

        # Check for circular buttons
        edit_button = page.locator('.moment-controls .edit-moment-btn').first
        await expect(edit_button).to_have_css('border-radius', '50%')

        await page.screenshot(path="jules-scratch/verification/01_moment_styles.png")

        # --- 2. Verify Edit from Search & Mobile Header ---
        # Go back to the main page to get to the global search
        await page.click('#back-to-grid')
        await page.click('#global-search-btn')
        await expect(page.locator('.search-results-list')).to_be_visible()

        # Check for edit button in search results
        await expect(page.locator('.search-result-item .edit-moment-btn').first).to_be_visible()

        # Desktop view screenshot
        await page.screenshot(path="jules-scratch/verification/02_search_desktop.png")

        # Mobile view screenshot
        await page.set_viewport_size({ "width": 375, "height": 667 })
        await page.screenshot(path="jules-scratch/verification/03_search_mobile.png")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
