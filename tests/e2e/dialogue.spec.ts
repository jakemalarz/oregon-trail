import { test, expect, Page } from '@playwright/test';

async function startNewGame(page: Page, seed = 31) {
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('start-game').click();
  await page.getByTestId('prof-banker').click();
  await page.getByTestId('names-continue').click();
  await page.getByTestId('month-April').click();
}

test.describe('Dialogue', () => {
  test('Matt the storekeeper opens, advances, and closes', async ({ page }) => {
    await startNewGame(page);
    await page.getByTestId('talk-storekeeper').click();
    await expect(page.locator('h2')).toContainText('Matt the Storekeeper');

    await page.getByTestId('dialogue-q-food').click();
    await expect(page.getByText(/two pounds of meal/)).toBeVisible();

    await page.getByTestId('dialogue-back').click();
    await page.getByTestId('dialogue-q-leave').click();
    await expect(page.locator('h2')).toContainText("Matt's General Store");
  });
});
