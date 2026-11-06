import { test, expect } from '@playwright/test';
import { PerspectiveCamera, Quaternion, Vector3 } from 'three';
import { applyMove } from '../../src/domain/cube/applyMove';
import { faceletToCoordinates } from '../../src/domain/cube/coordinates';
import { FACES } from '../../src/domain/cube/faces';
import { createSolvedCube } from '../../src/domain/cube/state';

test('enters a scrambled cube and receives a verified worker solution', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Solve' }).click();
  await expect(page.getByRole('alert')).toContainText('Some squares have not been assigned');
  const cube = applyMove(applyMove(createSolvedCube(), { face: 'R', turns: 1 }), {
    face: 'F',
    turns: -1,
  });
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(6, 6, 6);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const orientation = new Quaternion();
  const painted = new Set<string>();
  const canvas = page.locator('canvas');
  await expect(canvas).toBeVisible();
  const rotations = [
    null,
    'Rotate right',
    'Rotate right',
    'Rotate right',
    'Rotate right',
    'Rotate up',
    'Rotate up',
  ] as const;
  for (const rotation of rotations) {
    if (rotation) {
      const button = page.getByRole('button', { name: rotation });
      await button.click();
      await expect(button).toBeEnabled();
      const axis = rotation === 'Rotate right' ? new Vector3(0, 1, 0) : new Vector3(1, 0, 0);
      orientation.premultiply(new Quaternion().setFromAxisAngle(axis, Math.PI / 2));
    }
    const bounds = await canvas.boundingBox();
    if (!bounds) throw new Error('Canvas is not visible');
    camera.aspect = bounds.width / bounds.height;
    camera.updateProjectionMatrix();
    for (const face of FACES)
      for (let row = 0; row < 3; row++)
        for (let column = 0; column < 3; column++) {
          const key = `${face}${row}${column}`;
          const { position, normal } = faceletToCoordinates({ face, row, column });
          const worldNormal = new Vector3(...normal).applyQuaternion(orientation);
          if (worldNormal.dot(camera.position) < 0.5 || painted.has(key)) continue;
          const point = new Vector3(...position)
            .addScaledVector(new Vector3(...normal), 0.51)
            .applyQuaternion(orientation)
            .project(camera);
          await page
            .getByRole('button', { name: new RegExp(`^${cube[face][row * 3 + column]} \\(`) })
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
  expect(painted.size).toBe(54);
  await expect(page.getByText('0 squares remaining to assign.')).toBeVisible();
  await page.getByRole('button', { name: 'Solve' }).click();
  await expect(
    page.getByRole('alert').or(page.getByRole('region', { name: 'Verified solution' })),
  ).toBeVisible({ timeout: 30_000 });
  expect(await page.getByRole('alert').allTextContents()).toEqual([]);
  await expect(page.getByRole('region', { name: 'Verified solution' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText(/Hold your physical cube with white on top/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rotate right' })).toBeEnabled();
  await page.getByRole('button', { name: 'New Cube' }).click();
  await expect(page.getByText('54 squares remaining to assign.')).toBeVisible();
});
