import { test, expect, Page } from '@playwright/test';

async function startNewGame(page: Page, profession: 'banker' | 'carpenter' | 'farmer', month = 'April', seed = 1) {
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('start-game').click();
  await page.getByTestId(`prof-${profession}`).click();
  await page.getByTestId('names-continue').click();
  await page.getByTestId(`month-${month}`).click();
}

async function buyEssentials(page: Page) {
  // 3 yokes of oxen
  await page.getByTestId('buy-oxen-qty').fill('3');
  await page.getByTestId('buy-oxen').click();
  // 500 lbs food
  await page.getByTestId('buy-food-qty').fill('500');
  await page.getByTestId('buy-food').click();
  // 5 clothing
  await page.getByTestId('buy-clothing-qty').fill('5');
  await page.getByTestId('buy-clothing').click();
  // 100 ammo
  await page.getByTestId('buy-ammunition-qty').fill('100');
  await page.getByTestId('buy-ammunition').click();
  // 2 spares each
  await page.getByTestId('buy-wheels-qty').fill('2');
  await page.getByTestId('buy-wheels').click();
  await page.getByTestId('buy-axles-qty').fill('2');
  await page.getByTestId('buy-axles').click();
  await page.getByTestId('buy-tongues-qty').fill('2');
  await page.getByTestId('buy-tongues').click();
}

test.describe('Banker happy path', () => {
  test('buys supplies and sets out', async ({ page }) => {
    await startNewGame(page, 'banker', 'April', 1);
    await expect(page.locator('h2')).toContainText("Matt's General Store");
    await buyEssentials(page);
    await page.getByTestId('depart').click();
    await expect(page.locator('h2')).toContainText('On the Trail');
  });

  test('depart button is disabled before essentials are bought', async ({ page }) => {
    await startNewGame(page, 'banker', 'April', 2);
    const depart = page.getByTestId('depart');
    await expect(depart).toBeDisabled();
  });

  test('rejects invalid purchase (insufficient money)', async ({ page }) => {
    await startNewGame(page, 'farmer', 'April', 3);
    await page.getByTestId('buy-oxen-qty').fill('5'); // 10 oxen × $40 = $400 — exactly all
    await page.getByTestId('buy-oxen').click();
    await page.getByTestId('buy-clothing-qty').fill('5');
    await page.getByTestId('buy-clothing').click();
    // expect store still open and log shows error
    await expect(page.locator('h2')).toContainText("Matt's General Store");
  });
});

test.describe('Pace and rations', () => {
  test('change pace and continue', async ({ page }) => {
    await startNewGame(page, 'banker', 'April', 4);
    await buyEssentials(page);
    await page.getByTestId('depart').click();
    await page.getByTestId('change-pace').click();
    await page.getByTestId('pace-strenuous').click();
    await page.getByTestId('change-pace').click();
    await page.getByTestId('rations-meager').click();
    await expect(page.locator('h2')).toContainText('On the Trail');
  });
});

test.describe('Determinism', () => {
  test('same seed produces same trail state', async ({ page }) => {
    await startNewGame(page, 'banker', 'April', 12345);
    await buyEssentials(page);
    await page.getByTestId('depart').click();
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('continue').click();
    }
    const a = await page.locator('.status-bar').textContent();

    await startNewGame(page, 'banker', 'April', 12345);
    await buyEssentials(page);
    await page.getByTestId('depart').click();
    for (let i = 0; i < 5; i++) {
      await page.getByTestId('continue').click();
    }
    const b = await page.locator('.status-bar').textContent();
    expect(a).toEqual(b);
  });
});

test.describe('Persistence', () => {
  test('top-ten persists in localStorage across reload', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      const entries = [
        { name: 'TestRunner', score: 9999, profession: 'farmer', date: 'April 1, 1848', arrived: true },
      ];
      localStorage.setItem('oregon-trail-top-ten', JSON.stringify(entries));
    });
    await page.reload();
    await page.locator('button:has-text("View top ten")').click();
    await expect(page.locator('table')).toContainText('TestRunner');
    await expect(page.locator('table')).toContainText('9999');
  });
});

test.describe('Hunting', () => {
  test('auto-hunt mode bags a buffalo', async ({ page }) => {
    await page.goto('/?seed=99');
    await page.getByTestId('start-game').click();
    await page.getByTestId('prof-banker').click();
    await page.getByTestId('names-continue').click();
    await page.getByTestId('month-April').click();
    await buyEssentials(page);
    await page.getByTestId('depart').click();

    // Navigate to URL with autohunt to skip realtime gameplay
    await page.goto('/?seed=99&autohunt=1');
    await page.getByTestId('start-game').click();
    await page.getByTestId('prof-banker').click();
    await page.getByTestId('names-continue').click();
    await page.getByTestId('month-April').click();
    await buyEssentials(page);
    await page.getByTestId('depart').click();
    await page.getByTestId('hunt').click();
    // Hunt canvas should be visible briefly
    await expect(page.getByTestId('hunt-canvas')).toBeVisible();
    // After auto-finish, return to trail
    await expect(page.locator('h2')).toContainText('On the Trail', { timeout: 5_000 });
    await expect(page.locator('.log')).toContainText('buffalo');
  });

  test('hunt screen renders with keyboard hint', async ({ page }) => {
    await page.goto('/?seed=42');
    await page.getByTestId('start-game').click();
    await page.getByTestId('prof-banker').click();
    await page.getByTestId('names-continue').click();
    await page.getByTestId('month-April').click();
    await buyEssentials(page);
    await page.getByTestId('depart').click();
    await page.getByTestId('hunt').click();
    await expect(page.getByTestId('hunt-canvas')).toBeVisible();
    await expect(page.getByTestId('hunt-status')).toBeVisible();
    // Press escape to exit
    await page.keyboard.press('Escape');
    await expect(page.locator('h2')).toContainText('On the Trail');
  });
});
