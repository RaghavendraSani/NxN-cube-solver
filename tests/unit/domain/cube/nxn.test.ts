// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FACES } from '../../../../src/domain/cube/faces';
import { applyMove } from '../../../../src/domain/cube/applyMove';
import { createSolvedCube } from '../../../../src/domain/cube/state';
import {
  createNxNCube,
  toNxNCoordinates,
  fromNxNCoordinates,
  applyNxNMove,
} from '../../../../src/domain/nxn/cube';

describe('NxN cube foundations', () => {
  it.each([3, 4])('round trips every facelet for size %i', (size) => {
    for (const face of FACES)
      for (let row = 0; row < size; row++)
        for (let column = 0; column < size; column++) {
          const address = { face, row, column };
          expect(fromNxNCoordinates(toNxNCoordinates(address, size), size)).toEqual(address);
        }
  });
  it('creates 96 unassigned stickers for 4x4', () => {
    const state = createNxNCube(4);
    expect(FACES.flatMap((face) => state[face])).toEqual(Array(96).fill('unassigned'));
  });
  it('reverses every outer, inner, and wide face turn', () => {
    const cube = Object.fromEntries(
      FACES.map((face) => [face, Array.from({ length: 16 }, (_, index) => `${face}${index}`)]),
    ) as unknown as ReturnType<typeof createNxNCube>;
    for (const face of FACES)
      for (const layer of [0, 1])
        for (const width of [1, 2])
          for (const turns of [1, -1, 2] as const) {
            const move = { face, layer, width, turns };
            const next = applyNxNMove(cube, 4, move);
            expect(
              applyNxNMove(next, 4, { ...move, turns: turns === 2 ? 2 : turns === 1 ? -1 : 1 }),
            ).toEqual(cube);
            let repeat = cube;
            for (let i = 0; i < 4; i++) repeat = applyNxNMove(repeat, 4, move);
            expect(repeat).toEqual(cube);
          }
  });
  it('turns the inner right slice as expected and leaves outer stickers alone', () => {
    const cube = createNxNCube(4, true);
    const next = applyNxNMove(cube, 4, { face: 'R', layer: 1, width: 1, turns: 1 });
    expect([next.U[2], next.F[2], next.D[2], next.B[1]]).toEqual([
      'green',
      'yellow',
      'blue',
      'white',
    ]);
    expect(next.R).toEqual(cube.R);
    expect(next.U[3]).toBe('white');
  });
  it('matches the existing 3x3 engine for every face turn', () => {
    const state = applyMove(createSolvedCube(), { face: 'F', turns: 1 });
    for (const face of FACES)
      for (const turns of [1, -1, 2] as const) {
        expect(applyNxNMove(state, 3, { face, layer: 0, width: 1, turns })).toEqual(
          applyMove(state, { face, turns }),
        );
      }
  });
  it('matches a wide turn to its two component layers', () => {
    const cube = createNxNCube(4, true);
    for (const face of FACES) {
      const outer = applyNxNMove(cube, 4, { face, layer: 0, width: 1, turns: 1 });
      const both = applyNxNMove(outer, 4, { face, layer: 1, width: 1, turns: 1 });
      expect(applyNxNMove(cube, 4, { face, layer: 0, width: 2, turns: 1 })).toEqual(both);
    }
  });
});
