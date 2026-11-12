// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { Quaternion, Vector3 } from 'three';
import { coordinatesToFacelet, faceletToCoordinates } from '../../../src/domain/cube/coordinates';
import { FACES, type Face } from '../../../src/domain/cube/faces';
import { createSolvedCube } from '../../../src/domain/cube/state';
import type { CubeState } from '../../../src/domain/cube/types';
import type { Color } from '../../../src/domain/cube/colors';
import { applyMove } from '../../../src/domain/cube/applyMove';
import { validateCube } from '../../../src/domain/validation/validateCube';
import { solveCube, verifySolution } from '../../../src/solver/solveCube';

/** Rotate the whole cube to test a different physical orientation. */
function rotate(state: CubeState, axis: Vector3): CubeState {
  const result = Object.fromEntries(FACES.map((face) => [face, Array<Color>(9)])) as Record<
    Face,
    Color[]
  >;
  const rotation = new Quaternion().setFromAxisAngle(axis, Math.PI / 2);
  const transform = (vector: readonly [number, number, number]): [number, number, number] => {
    const rotated = new Vector3(...vector).applyQuaternion(rotation);
    return [Math.round(rotated.x), Math.round(rotated.y), Math.round(rotated.z)];
  };
  for (const face of FACES)
    for (let row = 0; row < 3; row++)
      for (let column = 0; column < 3; column++) {
        const { position, normal } = faceletToCoordinates({ face, row, column });
        const target = coordinatesToFacelet({
          position: transform(position),
          normal: transform(normal),
        });
        result[target.face][target.row * 3 + target.column] = state[face][row * 3 + column];
      }
  return result;
}

describe('whole-cube orientations', () => {
  it('validates and solves a scrambled cube in all 24 orientations', () => {
    const start = applyMove(applyMove(createSolvedCube(), { face: 'R', turns: 1 }), {
      face: 'F',
      turns: -1,
    });
    const queue = [start];
    const seen = new Set<string>();
    while (queue.length) {
      const state = queue.shift()!;
      const key = FACES.map((face) => state[face][4]).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      expect(validateCube(state)).toEqual({ valid: true });
      expect(verifySolution(state, solveCube(state))).toBe(true);
      queue.push(rotate(state, new Vector3(1, 0, 0)), rotate(state, new Vector3(0, 1, 0)));
    }
    expect(seen.size).toBe(24);
  }, 60000);
});
