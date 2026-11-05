// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyMove } from '../../../../src/domain/cube/applyMove';
import { FACES, type Face } from '../../../../src/domain/cube/faces';
import {
  faceletToCoordinates,
  coordinatesToFacelet,
} from '../../../../src/domain/cube/coordinates';
import { inverseMove, type Move } from '../../../../src/domain/cube/moves';
import { createSolvedCube, createUnassignedCube } from '../../../../src/domain/cube/state';
import { isSolved } from '../../../../src/domain/cube/isSolved';

describe('cube domain', () => {
  it('round-trips all 54 facelet coordinates', () => {
    for (const face of FACES)
      for (let row = 0; row < 3; row++)
        for (let column = 0; column < 3; column++) {
          const address = { face, row, column };
          expect(coordinatesToFacelet(faceletToCoordinates(address))).toEqual(address);
        }
  });

  it('recognizes solved cubes but not unassigned or turned cubes', () => {
    expect(isSolved(createSolvedCube())).toBe(true);
    expect(isSolved(createUnassignedCube())).toBe(false);
    expect(isSolved(applyMove(createSolvedCube(), { face: 'R', turns: 1 }))).toBe(false);
  });

  it('rotates the face clockwise and reverses the back-face strip for R', () => {
    const cube = createSolvedCube();
    const patterned = {
      ...cube,
      R: ['white', 'red', 'green', 'orange', 'blue', 'yellow', 'red', 'green', 'white'] as const,
      U: ['white', 'white', 'red', 'white', 'white', 'green', 'white', 'white', 'blue'] as const,
    };
    const result = applyMove(patterned, { face: 'R', turns: 1 });
    expect(result.R).toEqual([
      'red',
      'orange',
      'white',
      'green',
      'blue',
      'red',
      'white',
      'yellow',
      'green',
    ]);
    expect([result.B[0], result.B[3], result.B[6]]).toEqual(['blue', 'green', 'red']);
    expect(patterned.U[2]).toBe('red');
  });

  it.each(FACES)('%s turns preserve state and reverse correctly', (face: Face) => {
    const start = applyMove(createSolvedCube(), { face: 'F', turns: 1 });
    for (const turns of [1, -1, 2] as const) {
      const move: Move = { face, turns };
      const once = applyMove(start, move);
      expect(applyMove(once, inverseMove(move))).toEqual(start);
      expect(applyMove(applyMove(applyMove(once, move), move), move)).toEqual(start);
    }
    expect(start).toEqual(applyMove(createSolvedCube(), { face: 'F', turns: 1 }));
  });

  it('matches independently specified clockwise face turns on a solved cube', () => {
    const expected: Record<Face, readonly [Face, number[], Face][]> = {
      U: [
        ['F', [0, 1, 2], 'R'],
        ['R', [0, 1, 2], 'B'],
        ['B', [0, 1, 2], 'L'],
        ['L', [0, 1, 2], 'F'],
      ],
      D: [
        ['F', [6, 7, 8], 'L'],
        ['L', [6, 7, 8], 'B'],
        ['B', [6, 7, 8], 'R'],
        ['R', [6, 7, 8], 'F'],
      ],
      R: [
        ['U', [2, 5, 8], 'F'],
        ['F', [2, 5, 8], 'D'],
        ['D', [2, 5, 8], 'B'],
        ['B', [0, 3, 6], 'U'],
      ],
      L: [
        ['U', [0, 3, 6], 'B'],
        ['B', [2, 5, 8], 'D'],
        ['D', [0, 3, 6], 'F'],
        ['F', [0, 3, 6], 'U'],
      ],
      F: [
        ['U', [6, 7, 8], 'L'],
        ['L', [2, 5, 8], 'D'],
        ['D', [0, 1, 2], 'R'],
        ['R', [0, 3, 6], 'U'],
      ],
      B: [
        ['U', [0, 1, 2], 'R'],
        ['R', [2, 5, 8], 'D'],
        ['D', [6, 7, 8], 'L'],
        ['L', [0, 3, 6], 'U'],
      ],
    };
    const solved = createSolvedCube();
    for (const face of FACES) {
      const result = applyMove(solved, { face, turns: 1 });
      for (const [destination, indices, source] of expected[face]) {
        for (const index of indices) expect(result[destination][index]).toBe(solved[source][4]);
      }
    }
  });
});
