import { test, expect } from '@playwright/test';

test.describe('Title screen', () => {
  test('shows title and start button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('The Oregon Trail');
    await expect(page.getByTestId('start-game')).toBeVisible();
  });

  test('navigates to top ten', async ({ page }) => {
    await page.goto('/');
    await page.locator('button:has-text("View top ten")').click();
    await expect(page.locator('h2')).toContainText('Top Ten');
    await page.getByTestId('top-back').click();
    await expect(page.locator('h1')).toContainText('The Oregon Trail');
  });

  test('sound toggle is interactive', async ({ page }) => {
    await page.goto('/');
    const toggle = page.getByTestId('sound-toggle');
    await expect(toggle).toBeVisible();
    const initial = await toggle.textContent();
    await toggle.click();
    const after = await toggle.textContent();
    expect(initial).not.toEqual(after);
  });
});
