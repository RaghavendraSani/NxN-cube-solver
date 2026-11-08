import { expect, test } from '@playwright/test';
import { PerspectiveCamera, Vector3 } from 'three';
import { toNxNCoordinates } from '../../src/domain/nxn/cube';

test('paints and rotates a 4x4 cube and rejects incomplete input', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Cube size').selectOption('4');
  await expect(page.getByText('96 squares remaining to assign.')).toBeVisible();
  await page.getByRole('button', { name: 'Solve' }).click();
  await expect(page.getByRole('alert')).toContainText('missing or invalid pieces');
  const canvas = page.locator('canvas');
  const bounds = (await canvas.boundingBox())!;
  const camera = new PerspectiveCamera(35, bounds.width / bounds.height, 0.1, 100);
  camera.position.set(6, 6, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const { position, normal } = toNxNCoordinates({ face: 'F', row: 1, column: 1 }, 4);
  const p = new Vector3(...position)
    .multiplyScalar(3 / 8)
    .addScaledVector(new Vector3(...normal), (0.51 * 3) / 4)
    .project(camera);
  const location = { x: ((p.x + 1) * bounds.width) / 2, y: ((1 - p.y) * bounds.height) / 2 };
  await page.getByRole('button', { name: /^green \(/ }).click();
  await canvas.click({ position: location });
  await expect(page.getByText('95 squares remaining to assign.')).toBeVisible();
  await page.getByRole('button', { name: /^red \(/ }).click();
  await canvas.click({ position: location });
  await expect(page.getByRole('button', { name: 'red (1/16)' })).toBeVisible();
  await page.getByRole('button', { name: 'Rotate right' }).click();
  await expect(page.getByRole('button', { name: 'Rotate right' })).toBeEnabled();
  await expect(page.getByText('95 squares remaining to assign.')).toBeVisible();
  await page.getByLabel('Cube size').selectOption('3');
  await expect(page.getByText('54 squares remaining to assign.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Solve' })).toBeEnabled();
});
