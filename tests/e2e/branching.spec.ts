import { test, expect, Page } from '@playwright/test';

async function gotoOutfitted(page: Page, seed: number) {
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('start-game').click();
  await page.getByTestId('prof-banker').click();
  await page.getByTestId('names-continue').click();
  await page.getByTestId('month-April').click();
  await page.getByTestId('buy-oxen-qty').fill('3');
  await page.getByTestId('buy-oxen').click();
  await page.getByTestId('buy-food-qty').fill('800');
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
  await page.getByTestId('depart').click();
}

test.describe('Route branching', () => {
  test('reaches South Pass and presents both branches', async ({ page }) => {
    await gotoOutfitted(page, 31);
    for (let i = 0; i < 600; i++) {
      const heading = await page.locator('h2').first().textContent();
      if (heading && heading.includes('trail forks')) break;
      const cont = page.getByTestId('continue');
      if (await cont.count()) { await cont.click(); continue; }
      const leave = page.getByTestId('leave-landmark');
      if (await leave.count()) { await leave.click(); continue; }
      const ford = page.getByTestId('cross-ford');
      if (await ford.count()) { await ford.click(); continue; }
      const back = page.getByTestId('back-to-title');
      if (await back.count()) break;
    }
    await expect(page.locator('h2')).toContainText('trail forks');
    await expect(page.getByTestId('route-south-pass->green-river')).toBeVisible();
    await expect(page.getByTestId('route-south-pass->fort-bridger')).toBeVisible();
    await page.getByTestId('route-south-pass->fort-bridger').click();
    await expect(page.locator('.log')).toContainText('Fort Bridger');
  });
});
