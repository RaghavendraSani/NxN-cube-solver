// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyMove } from '../../../src/domain/cube/applyMove';
import { createSolvedCube, createUnassignedCube } from '../../../src/domain/cube/state';
import { FACES } from '../../../src/domain/cube/faces';
import { solveCube, toFaceletString, verifySolution } from '../../../src/solver/solveCube';
import type { Color } from '../../../src/domain/cube/colors';
import type { CubeState } from '../../../src/domain/cube/types';
import type { Face } from '../../../src/domain/cube/faces';

describe('3×3 solver adapter', () => {
  it('maps a solved cube to the standard facelet string', () => {
    expect(toFaceletString(createSolvedCube())).toBe(FACES.map((face) => face.repeat(9)).join(''));
  });

  it('solves and independently verifies known and generated scrambles', () => {
    expect(solveCube(createSolvedCube())).toEqual([]);
    let state = createSolvedCube();
    let seed = 817;
    for (let sample = 0; sample < 20; sample++) {
      for (let n = 0; n < 12; n++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const face = FACES[(seed >>> 16) % 6];
        seed = (seed * 1664525 + 1013904223) >>> 0;
        state = applyMove(state, { face, turns: ([1, -1, 2] as const)[(seed >>> 16) % 3] });
      }
      const moves = solveCube(state);
      expect(verifySolution(state, moves)).toBe(true);
      expect(verifySolution(state, [])).toBe(false);
    }
  }, 60000);

  it('rejects invalid states and corrupted output', () => {
    expect(() => solveCube(createUnassignedCube())).toThrow();
    expect(verifySolution(createSolvedCube(), [{ face: 'R', turns: 1 }])).toBe(false);
  });

  it('solves an independently documented facelet fixture', () => {
    const input = 'DUUBULDBFRBFRRULLLBRDFFFBLURDBFDFDRFRULBLUFDURRBLBDUDL';
    const solved = createSolvedCube();
    const state = Object.fromEntries(
      FACES.map((face, index) => [
        face,
        Array.from(
          input.slice(index * 9, index * 9 + 9),
          (letter) => solved[letter as Face][4] as Color,
        ),
      ]),
    ) as CubeState;
    expect(toFaceletString(state)).toBe(input);
    expect(verifySolution(state, solveCube(state))).toBe(true);
  }, 60000);
});
