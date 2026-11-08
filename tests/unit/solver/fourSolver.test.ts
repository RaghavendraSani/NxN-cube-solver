// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyNxNMove, createNxNCube, fromNxNCoordinates } from '../../../src/domain/nxn/cube';
import { solveFour, verifyFourSolution } from '../../../src/solver/fourByFour/solver';
import {
  SOLVED_444_STATE,
  faceletColoursOf444,
} from '../../../vendor/cubesmith/src/puzzles/444/state';
import { pieces444 } from '../../../vendor/cubesmith/src/puzzles/444/pieces';
import { parityOf444Handoff, to333State } from '../../../vendor/cubesmith/src/puzzles/444/handoff';
import { FACES as solverFaces } from '../../../vendor/cubesmith/src/notation/move';
import type { Face } from '../../../src/domain/cube/faces';
import type { Color } from '../../../src/domain/cube/colors';
import { FACES } from '../../../src/domain/cube/faces';

describe('4x4 solver adapter', () => {
  it('returns an empty verified solution for a solved cube', () => {
    expect(solveFour(createNxNCube(4, true))).toEqual([]);
  });
  it('solves a legal outer, wide and inner-slice scramble by independent replay', () => {
    let cube = createNxNCube(4, true);
    for (const move of [
      { face: 'R', layer: 0, width: 1, turns: 1 },
      { face: 'U', layer: 0, width: 2, turns: -1 },
      { face: 'F', layer: 1, width: 1, turns: 1 },
    ] as const)
      cube = applyNxNMove(cube, 4, move);
    const solution = solveFour(cube);
    expect(solution.length).toBeGreaterThan(0);
    expect(verifyFourSolution(cube, solution)).toBe(true);
    expect(verifyFourSolution(cube, [])).toBe(false);
  }, 120000);
  it('rejects incomplete states', () => {
    expect(() => solveFour(createNxNCube(4))).toThrow();
  });
  it('independently replays five deterministic 25-move scrambles', () => {
    let seed = 0x42d9;
    for (let sample = 0; sample < 5; sample++) {
      let cube = createNxNCube(4, true);
      for (let n = 0; n < 25; n++) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const face = FACES[(seed >>> 16) % 6];
        seed = (seed * 1664525 + 1013904223) >>> 0;
        cube = applyNxNMove(cube, 4, {
          face,
          layer: 0,
          width: ((seed >>> 8) % 2) + 1,
          turns: ([1, -1, 2] as const)[(seed >>> 16) % 3],
        });
      }
      const solution = solveFour(cube);
      expect(verifyFourSolution(cube, solution)).toBe(true);
    }
  }, 300000);
  it.each(['flip', 'permutation'] as const)(
    'replays a reduced %s parity case to solved',
    (kind) => {
      const wings = [...SOLVED_444_STATE.wingPermutation];
      if (kind === 'flip') [wings[0], wings[1]] = [wings[1], wings[0]];
      else [wings[0], wings[1], wings[2], wings[3]] = [wings[2], wings[3], wings[0], wings[1]];
      const pieceState = { ...SOLVED_444_STATE, wingPermutation: wings };
      expect(parityOf444Handoff(to333State(pieceState))).toBe(kind);
      const solved = createNxNCube(4, true);
      const cube = Object.fromEntries(
        Object.entries(solved).map(([face, colors]) => [face, [...colors]]),
      ) as Record<Face, Color[]>;
      const colors = faceletColoursOf444(pieceState);
      pieces444().facelets.forEach(({ position, normal }, index) => {
        const address = fromNxNCoordinates(
          {
            position: [position[0] - normal[0], position[1] - normal[1], position[2] - normal[2]],
            normal,
          },
          4,
        );
        cube[address.face][address.row * 4 + address.column] =
          solved[solverFaces[colors[index]]][0];
      });
      const solution = solveFour(cube);
      expect(solution.length).toBeGreaterThan(0);
      expect(verifyFourSolution(cube, solution)).toBe(true);
      expect(verifyFourSolution(cube, solution.slice(0, -1))).toBe(false);
    },
    120000,
  );
});
