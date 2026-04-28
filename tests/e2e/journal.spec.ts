import { test, expect, Page } from '@playwright/test';

async function startNewGame(page: Page, seed = 77) {
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('start-game').click();
  await page.getByTestId('prof-banker').click();
  await page.getByTestId('names-continue').click();
  await page.getByTestId('month-April').click();
}

async function buyEssentials(page: Page) {
  await page.getByTestId('buy-oxen-qty').fill('3');
  await page.getByTestId('buy-oxen').click();
  await page.getByTestId('buy-food-qty').fill('500');
  await page.getByTestId('buy-food').click();
  await page.getByTestId('buy-clothing-qty').fill('5');
  await page.getByTestId('buy-clothing').click();
  await page.getByTestId('buy-ammunition-qty').fill('100');
  await page.getByTestId('buy-ammunition').click();
  await page.getByTestId('buy-wheels-qty').fill('2');
  await page.getByTestId('buy-wheels').click();
  await page.getByTestId('buy-axles-qty').fill('2');
  await page.getByTestId('buy-axles').click();
  await page.getByTestId('buy-tongues-qty').fill('2');
  await page.getByTestId('buy-tongues').click();
}

test.describe('Journal', () => {
  test('shows entries after travel and closes back to trail', async ({ page }) => {
    await startNewGame(page);
    await buyEssentials(page);
    await page.getByTestId('depart').click();
    for (let i = 0; i < 5; i++) await page.getByTestId('continue').click();
    await page.getByTestId('journal').click();
    await expect(page.locator('h2')).toContainText('Trail Diary');
    await expect(page.getByTestId('journal-list')).toBeVisible();
    await expect(page.getByTestId('journal-depart').first()).toBeVisible();
    await page.getByTestId('journal-back').click();
    await expect(page.locator('h2')).toContainText('On the Trail');
  });
});
