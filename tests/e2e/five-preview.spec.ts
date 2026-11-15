import { test, expect } from '@playwright/test';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { applyNxNMove, createNxNCube, toNxNCoordinates } from '../../src/domain/nxn/cube';
import { FACES } from '../../src/domain/cube/faces';

test('plays the local 5x5 preview after one inner turn', async ({ page }) => {
  await page.goto('/?preview5');
  await page.getByLabel('Cube size').selectOption('5');
  const cube = applyNxNMove(createNxNCube(5, true), 5, {
    face: 'R',
    layer: 1,
    width: 1,
    turns: 1,
  });
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(6, 6, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const orientation = new Quaternion();
  const painted = new Set<string>();
  const canvas = page.locator('canvas');

  for (const rotation of [
    null,
    'Rotate right',
    'Rotate right',
    'Rotate right',
    'Rotate right',
    'Rotate up',
    'Rotate up',
  ] as const) {
    if (rotation) {
      const button = page.getByRole('button', { name: rotation });
      await button.click();
      await expect(button).toBeEnabled();
      const axis = rotation === 'Rotate right' ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      orientation.premultiply(new Quaternion().setFromAxisAngle(axis, Math.PI / 2));
    }
    const bounds = (await canvas.boundingBox())!;
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    for (const face of FACES)
      for (let row = 0; row < 5; row++)
        for (let column = 0; column < 5; column++) {
          const key = `${face}${row}${column}`;
          const { position, normal } = toNxNCoordinates({ face, row, column }, 5);
          if (
            new Vector3(...normal).applyQuaternion(orientation).dot(camera.position) < 0.5 ||
            painted.has(key)
          )
            continue;
          const point = new Vector3(...position)
            .multiplyScalar(3 / 10)
            .addScaledVector(new Vector3(...normal), (0.51 * 3) / 5)
            .applyQuaternion(orientation)
            .project(camera);
          await page
            .getByRole('button', { name: new RegExp(`^${cube[face][row * 5 + column]} \\(`) })
            .click();
          await canvas.click({
            position: {
              x: ((point.x + 1) * bounds.width) / 2,
              y: ((1 - point.y) * bounds.height) / 2,
            },
          });
          painted.add(key);
        }
  }
  expect(painted.size).toBe(150);
  await expect(page.getByText('0 squares remaining to assign.')).toBeVisible();
  await page.getByRole('button', { name: 'Solve' }).click();
  await expect(page.getByRole('region', { name: 'Verified solution' })).toBeVisible({
    timeout: 130000,
  });
  await page.getByLabel('Animation speed').selectOption('250');
  const next = page.getByRole('button', { name: 'Next move' });
  let count = 0;
  while (await next.isVisible()) {
    await next.click();
    await expect(next.and(page.locator(':enabled')).or(page.getByText('Cube solved!'))).toBeVisible(
      { timeout: 5000 },
    );
    if (++count > 30) throw new Error('Preview playback did not finish');
  }
  await expect(page.getByText('Cube solved!')).toBeVisible();
});
