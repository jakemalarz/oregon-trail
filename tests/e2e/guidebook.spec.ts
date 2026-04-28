import { test, expect } from '@playwright/test';

test.describe('Guidebook', () => {
  test('opens from title, switches landmarks, and returns', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('guidebook').click();
    await expect(page.locator('h2')).toContainText('Learn About the Trail');
    await expect(page.getByTestId('guidebook-list')).toBeVisible();
    await page.getByTestId('guidebook-chimney-rock').click();
    await expect(page.locator('h3')).toContainText('Chimney Rock');
    await page.getByTestId('guidebook-back').click();
    await expect(page.locator('h1')).toContainText('The Oregon Trail');
  });
});
