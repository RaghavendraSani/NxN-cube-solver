import { expect, test } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';

test('serves third-party license notices with the application', async ({ request }) => {
  const response = await request.get('/THIRD_PARTY_NOTICES.txt');
  expect(response.ok()).toBe(true);
  const text = await response.text();
  expect(text).toContain('React');
  expect(text).toContain('three.js');
  expect(text).toContain('@turnwise/cube-solver');
  expect(text).toContain('@cubesmith/scrambler');
});

test('resizes, does not persist an incomplete entry, and continues without network', async ({
  page,
  context,
}) => {
  await page.goto('/');
  await expect(page.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: /^green \(/ }).click();
  const canvas = page.locator('canvas');
  const bounds = (await canvas.boundingBox())!;
  const camera = new PerspectiveCamera(35, bounds.width / bounds.height, 0.1, 100);
  camera.position.set(6, 6, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const point = new Vector3(0, 0, 1.51).project(camera);
  await canvas.click({
    position: { x: ((point.x + 1) * bounds.width) / 2, y: ((1 - point.y) * bounds.height) / 2 },
  });
  await expect(page.getByText('53 squares remaining to assign.')).toBeVisible();
  await page.setViewportSize({ width: 650, height: 750 });
  await expect(page.locator('canvas')).toBeVisible();
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Rotate right' }).click();
  await expect(page.getByRole('button', { name: 'Rotate right' })).toBeEnabled();
  await expect(page.getByText('53 squares remaining to assign.')).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText('54 squares remaining to assign.')).toBeVisible();
});

test('reports an unavailable WebGL renderer', async ({ page }) => {
  await page.addInitScript(() => {
    HTMLCanvasElement.prototype.getContext = (() =>
      null) as typeof HTMLCanvasElement.prototype.getContext;
  });
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText('3D rendering is unavailable');
  await expect(page.getByRole('button', { name: 'Rotate right' })).toBeDisabled();
});
