import { test, expect, Page } from '@playwright/test';

async function gotoOutfitted(page: Page, seed: number) {
  await page.goto(`/?seed=${seed}`);
  await page.getByTestId('start-game').click();
  await page.getByTestId('prof-banker').click();
  await page.getByTestId('names-continue').click();
  await page.getByTestId('month-April').click();
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
  await page.getByTestId('depart').click();
}

test.describe('Tombstone', () => {
  test('death captures epitaph and persists in localStorage', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('oregon-trail-tombstones-v1'));
    await gotoOutfitted(page, 21);

    // Force a fatal state via the test-only engine hook
    await page.evaluate(() => {
      const w = window as unknown as { __engine?: { state: { party: Array<{ alive: boolean; health: number }>; ended: boolean } } };
      const eng = w.__engine;
      if (!eng) throw new Error('engine not exposed');
      for (const m of eng.state.party) {
        m.alive = false;
        m.health = 0;
      }
      eng.state.ended = true;
    });

    // Click continue once — showTrail will redirect to showEndScreen → showTombstone
    await page.getByTestId('continue').click();
    await expect(page.locator('h1')).toContainText('Here Lies', { timeout: 5_000 });

    await page.getByTestId('epitaph-input').fill('Gone west forever.');
    await page.getByTestId('epitaph-carve').click();
    await expect(page.locator('h1')).toContainText('Game Over');

    const stored = await page.evaluate(() => localStorage.getItem('oregon-trail-tombstones-v1'));
    expect(stored).toContain('Gone west forever.');
  });
});
