import asyncio
from playwright.async_api import async_playwright, expect
import os

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch()
        page = await browser.new_page()

        # Get the absolute path to the index.html file
        file_path = os.path.abspath('index.html')
        await page.goto(f'file://{file_path}')

        # Wait for the app to load and the grid container to be created.
        await page.wait_for_selector('#people-grid', timeout=5000)

        # --- 0. Verify Skeleton Loading for People Grid ---
        # Corrected selector to match the actual classes: .person-card.skeleton
        await expect(page.locator('.person-card.skeleton').first).to_be_visible()
        await page.screenshot(path='jules-scratch/verification/00_skeleton_grid.png')

        # --- 1. Verify the main grid and navigate to person detail ---
        # Wait for the real data to load, which replaces the skeleton cards.
        await expect(page.locator('.person-card:not(.skeleton)').first).to_be_visible()
        # Take a screenshot of the main grid after real data has loaded.
        await page.screenshot(path='jules-scratch/verification/01_main_grid.png')

        # Click the first person to go to the detail view
        await page.locator('.person-card:not(.skeleton)').first.click()

        # --- 2. Verify the redesigned moments list (with skeleton) ---
        # The skeleton for moments should appear immediately upon navigation.
        await page.wait_for_selector('.journal-moment-card.skeleton', timeout=5000)
        await expect(page.locator('.month-header').first).not_to_be_visible() # Headers shouldn't be visible yet
        await page.screenshot(path='jules-scratch/verification/02a_moments_list_skeleton.png')

        # Wait for the real moments to load.
        await page.wait_for_selector('.journal-moment-card:not(.skeleton)', timeout=5000)
        await expect(page.locator('.month-header').first).to_be_visible()
        await expect(page.locator('.fab')).to_be_visible() # Check for the '+' button
        # Take a screenshot of the redesigned moments list.
        await page.screenshot(path='jules-scratch/verification/02b_moments_list_loaded.png')

        # --- 3. Verify the "Add Moment" modal ---
        await page.locator('#show-add-moment-modal').click()
        await page.wait_for_selector('.modal-overlay.journal-modal', timeout=5000)
        await expect(page.locator('.journal-modal h2')).to_have_text('רגע חדש')
        await page.wait_for_timeout(500) # Wait for animation
        # Take a screenshot of the "Add Moment" modal.
        await page.screenshot(path='jules-scratch/verification/03_add_moment_modal.png')
        # Close the modal
        await page.locator('.journal-modal .modal-close-btn').click()
        await expect(page.locator('.modal-overlay.journal-modal')).to_be_hidden()

        # --- 4. Verify the "View/Edit Moment" modal ---
        # Click the first moment card to open the view modal.
        await page.locator('.journal-moment-card:not(.skeleton)').first.click()
        await page.wait_for_selector('.modal-overlay.journal-modal', timeout=5000)
        await expect(page.locator('.moment-view-content')).to_be_visible()
        await page.wait_for_timeout(500) # Wait for animation
        # Take a screenshot of the "View Moment" modal.
        await page.screenshot(path='jules-scratch/verification/04_view_moment_modal.png')

        await browser.close()
        print("Verification script completed successfully!")

if __name__ == '__main__':
    asyncio.run(main())