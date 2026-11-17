// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { FACES } from '../../../src/domain/cube/faces';
import type { CubeState } from '../../../src/domain/cube/types';
import { createCubeScene } from '../../../src/rendering/cubeScene';
import { applyNxNMove, fromNxNCoordinates, type LayerMove } from '../../../src/domain/nxn/cube';

function labelled(size: number): CubeState {
  return Object.fromEntries(
    FACES.map((name) => [
      name,
      Array.from({ length: size * size }, (_, index) => `${name}${index}`),
    ]),
  ) as unknown as CubeState;
}

/** Animate to the end and check every sticker lands where the domain move sends it. */
function checkDestinations(size: number, move: LayerMove) {
  const scene = createCubeScene(size);
  const original = labelled(size);
  const animation = scene.beginLayerTurn(move);
  animation.setProgress(1);
  const expected = applyNxNMove(original, size, move);
  const step = 3 / size;
  for (const address of scene.addresses) {
    const matrix = scene.stickerMatrix(address);
    const normal = new Vector3(0, 0, 1).transformDirection(matrix);
    const position = new Vector3()
      .setFromMatrixPosition(matrix)
      .sub(normal.clone().multiplyScalar(0.51 * step))
      .multiplyScalar(2 / step)
      .toArray()
      .map(Math.round) as [number, number, number];
    const destination = fromNxNCoordinates(
      { position, normal: normal.toArray().map(Math.round) as [number, number, number] },
      size,
    );
    expect(expected[destination.face][destination.row * size + destination.column]).toBe(
      original[address.face][address.row * size + address.column],
    );
  }
  animation.finish();
  // Finishing restores the resting transforms.
  const rest = createCubeScene(size);
  for (const address of scene.addresses)
    expect(scene.stickerMatrix(address).equals(rest.stickerMatrix(address))).toBe(true);
  scene.dispose();
  rest.dispose();
}

describe('layer animation', () => {
  it('highlights only the requested layer range', () => {
    const scene = createCubeScene(4);
    scene.setHighlight('R', 1, 1);
    expect(scene.highlightedCount()).toBe(16);
    scene.setHighlight('R', 0, 2);
    expect(scene.highlightedCount()).toBe(48);
    scene.setHighlight(null);
    expect(scene.highlightedCount()).toBe(0);
    scene.dispose();
  });

  it('animates every 3×3 face turn to the domain destinations', () => {
    for (const face of FACES)
      for (const turns of [1, -1, 2] as const)
        checkDestinations(3, { face, layer: 0, width: 1, turns });
  });

  it('animates 4×4 outer, inner and wide moves to the domain destinations', () => {
    for (const face of FACES)
      for (const [layer, width] of [
        [0, 1],
        [1, 1],
        [0, 2],
      ])
        for (const turns of [1, -1, 2] as const)
          checkDestinations(4, { face, layer, width, turns });
  });

  it('animates single layers of larger cubes to the domain destinations', () => {
    for (const [size, layers] of [
      [5, [0, 2, 4]],
      [8, [0, 3, 7]],
      [20, [0, 9, 10, 19]],
    ] as const)
      for (const face of ['U', 'L', 'B'] as const)
        for (const layer of layers) checkDestinations(size, { face, layer, width: 1, turns: 1 });
  });
});
