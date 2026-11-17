import { test, expect } from '@playwright/test';

// Example cubes of any size are legal scrambles, so the whole flow can run without
// painting thousands of squares by hand.
for (const size of [5, 6, 13, 20]) {
  test(`loads, solves, and finishes an example ${size}x${size} cube`, async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Cube size').selectOption(String(size));
    await page.getByRole('button', { name: 'Load example' }).click();
    await expect(page.getByText('0 squares remaining to assign.')).toBeVisible();
    await page.getByRole('button', { name: 'Solve' }).click();
    await expect(page.getByRole('region', { name: 'Verified solution' })).toBeVisible({
      timeout: 60_000,
    });
    const heading = (await page.getByText(/^Move 1 of \d+/).textContent()) ?? '';
    const total = Number(/of (\d+)/.exec(heading)![1]);
    // Jump to the last move without animation, then play it to completion.
    await page.getByLabel(/Go to move/).fill(String(total));
    await page.getByRole('button', { name: 'Go' }).click();
    await expect(page.getByText(new RegExp(`^Move ${total} of ${total}`))).toBeVisible();
    await page.getByRole('button', { name: 'Next move' }).click();
    await expect(page.getByText('Cube solved!')).toBeVisible({ timeout: 15_000 });
  });
}

test('zoom controls keep a large cube usable', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Cube size').selectOption('20');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Zoom in' }).click();
  await page.getByRole('button', { name: 'Zoom out' }).click();
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeEnabled();
});
