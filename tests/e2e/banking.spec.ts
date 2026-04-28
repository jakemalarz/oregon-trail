import { test, expect, Page } from '@playwright/test';

async function startNewGame(page: Page, seed = 11) {
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('start-game').click();
  await page.getByTestId('prof-banker').click();
  await page.getByTestId('names-continue').click();
  await page.getByTestId('month-April').click();
}

test.describe('Banking', () => {
  test('take a loan at Independence and immediately repay it', async ({ page }) => {
    await startNewGame(page);
    await page.getByTestId('visit-bank').click();
    await expect(page.locator('h2')).toContainText('Bank of Independence');

    await page.getByTestId('loan-500').click();
    await expect(page.getByText(/Outstanding loan/)).toBeVisible();

    await page.getByTestId('repay-all').click();
    await expect(page.getByText(/Outstanding loan/)).toHaveCount(0);

    await page.getByTestId('leave-bank').click();
    await expect(page.locator('h2')).toContainText("Matt's General Store");
  });

  test('loan persists when leaving the bank without repaying', async ({ page }) => {
    await startNewGame(page, 17);
    await page.getByTestId('visit-bank').click();
    await page.getByTestId('loan-250').click();
    await page.getByTestId('leave-bank').click();
    await expect(page.locator('h2')).toContainText("Matt's General Store");
    await page.getByTestId('visit-bank').click();
    await expect(page.getByText(/Outstanding loan/)).toBeVisible();
  });
});
