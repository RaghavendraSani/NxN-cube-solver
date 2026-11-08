// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { applyMove } from '../../../src/domain/cube/applyMove';
import { coordinatesToFacelet } from '../../../src/domain/cube/coordinates';
import { FACES } from '../../../src/domain/cube/faces';
import type { CubeState } from '../../../src/domain/cube/types';
import { createCubeScene } from '../../../src/rendering/cubeScene';
import { applyNxNMove, fromNxNCoordinates } from '../../../src/domain/nxn/cube';

describe('layer animation', () => {
  it('highlights only the requested 4x4 layer range', () => {
    const scene = createCubeScene(4);
    scene.setHighlight('R', 1, 1);
    expect(scene.facelets.filter((sticker) => sticker.children[1].visible)).toHaveLength(16);
    scene.setHighlight('R', 0, 2);
    expect(scene.facelets.filter((sticker) => sticker.children[1].visible)).toHaveLength(48);
    scene.dispose();
  });
  it('animates 4x4 outer, inner, and wide moves to the domain destinations', () => {
    for (const face of FACES)
      for (const [layer, width] of [
        [0, 1],
        [1, 1],
        [0, 2],
      ])
        for (const turns of [1, -1, 2] as const) {
          const scene = createCubeScene(4);
          const move = { face, layer, width, turns };
          const original = Object.fromEntries(
            FACES.map((name) => [
              name,
              Array.from({ length: 16 }, (_, index) => `${name}${index}`),
            ]),
          ) as unknown as CubeState;
          const animation = scene.beginLayerTurn(move);
          animation.setProgress(1);
          scene.group.updateMatrixWorld(true);
          const expected = applyNxNMove(original, 4, move);
          for (const sticker of scene.facelets) {
            const normal = new Vector3(0, 0, 1).applyQuaternion(
              sticker.getWorldQuaternion(new Quaternion()),
            );
            const position = sticker
              .getWorldPosition(new Vector3())
              .sub(normal.clone().multiplyScalar((0.51 * 3) / 4))
              .multiplyScalar(8 / 3)
              .toArray()
              .map(Math.round) as [number, number, number];
            const roundedNormal = normal.toArray().map(Math.round) as [number, number, number];
            const destination = fromNxNCoordinates({ position, normal: roundedNormal }, 4);
            const source = sticker.userData.address;
            expect(expected[destination.face][destination.row * 4 + destination.column]).toBe(
              original[source.face as keyof CubeState][source.row * 4 + source.column],
            );
          }
          animation.finish();
          scene.dispose();
        }
  });
  it('moves the correct stickers to the domain destinations for every face and turn', () => {
    for (const face of FACES)
      for (const turns of [1, -1, 2] as const) {
        const scene = createCubeScene();
        const move = { face, turns };
        // Unique labels check each sticker's destination, including rotations within a face.
        const original = Object.fromEntries(
          FACES.map((name) => [name, Array.from({ length: 9 }, (_, index) => `${name}${index}`)]),
        ) as unknown as CubeState;
        const animation = scene.beginLayerTurn(move);
        animation.setProgress(1);
        scene.group.updateMatrixWorld(true);
        const expected = applyMove(original, move);
        for (const sticker of scene.facelets) {
          const pos = sticker.getWorldPosition(new Vector3());
          const normal = new Vector3(0, 0, 1).applyQuaternion(
            sticker.getWorldQuaternion(new Quaternion()),
          );
          const roundedNormal = normal.toArray().map(Math.round) as [number, number, number];
          const position = pos
            .sub(normal.clone().multiplyScalar(0.51))
            .toArray()
            .map(Math.round) as [number, number, number];
          const dest = coordinatesToFacelet({ position, normal: roundedNormal });
          const source = sticker.userData.address;
          expect(expected[dest.face][dest.row * 3 + dest.column]).toBe(
            original[source.face as keyof typeof original][source.row * 3 + source.column],
          );
        }
        animation.finish();
        scene.dispose();
      }
  });
});
