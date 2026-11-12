// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createSolvedCube, createUnassignedCube } from '../../../../src/domain/cube/state';
import { applyMove } from '../../../../src/domain/cube/applyMove';
import { FACES, type Face } from '../../../../src/domain/cube/faces';
import type { Color } from '../../../../src/domain/cube/colors';
import type { CubeState } from '../../../../src/domain/cube/types';
import { validateCube } from '../../../../src/domain/validation/validateCube';

/** Swap two stickers in a copy to construct an invalid test state. */
function swap(state: CubeState, a: [Face, number], b: [Face, number]): CubeState {
  const copy = Object.fromEntries(FACES.map((face) => [face, [...state[face]]])) as Record<
    Face,
    Color[]
  >;
  [copy[a[0]][a[1]], copy[b[0]][b[1]]] = [copy[b[0]][b[1]], copy[a[0]][a[1]]];
  return copy;
}

describe('3×3 validation', () => {
  it('accepts solved and many deterministic legal scrambles', () => {
    let cube = createSolvedCube();
    expect(validateCube(cube).valid).toBe(true);
    let seed = 42;
    for (let i = 0; i < 1200; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const face = FACES[(seed >>> 16) % 6];
      seed = (seed * 1664525 + 1013904223) >>> 0;
      cube = applyMove(cube, { face, turns: ([1, -1, 2] as const)[(seed >>> 16) % 3] });
      expect(validateCube(cube)).toEqual({ valid: true });
    }
  });

  it('rejects incomplete entries and incorrect color counts', () => {
    expect(validateCube(createUnassignedCube())).toEqual({ valid: false, reason: 'incomplete' });
    const solved = createSolvedCube();
    expect(validateCube({ ...solved, U: Array<Color>(9).fill('red') })).toEqual({
      valid: false,
      reason: 'color-count',
    });
  });

  it('rejects swapped centers even with correct counts', () => {
    expect(validateCube(swap(createSolvedCube(), ['U', 4], ['D', 4]))).toEqual({
      valid: false,
      reason: 'centers',
    });
  });

  it('rejects a reflected center arrangement with the same opposite colors', () => {
    const cube = createSolvedCube();
    const reflected = { ...cube, R: cube.L, L: cube.R };
    expect(validateCube(reflected)).toEqual({ valid: false, reason: 'centers' });
  });

  it('rejects a single flipped edge', () => {
    expect(validateCube(swap(createSolvedCube(), ['U', 5], ['R', 1]))).toEqual({
      valid: false,
      reason: 'edge-orientation',
    });
  });

  it('rejects a single twisted corner', () => {
    const cube = swap(swap(createSolvedCube(), ['U', 8], ['R', 0]), ['U', 8], ['F', 2]);
    expect(validateCube(cube)).toEqual({ valid: false, reason: 'corner-orientation' });
  });

  it('rejects an odd swap of two edges', () => {
    const cube = swap(swap(createSolvedCube(), ['U', 5], ['U', 7]), ['R', 1], ['F', 1]);
    expect(validateCube(cube)).toEqual({ valid: false, reason: 'parity' });
  });

  it('rejects mirrored corners and duplicate pieces', () => {
    expect(validateCube(swap(createSolvedCube(), ['R', 0], ['F', 2])).valid).toBe(false);
    expect(validateCube(swap(createSolvedCube(), ['R', 1], ['F', 3])).valid).toBe(false);
  });
});
