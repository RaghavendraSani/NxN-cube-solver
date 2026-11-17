// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FACES } from '../../../src/domain/cube/faces';
import type { CubeState } from '../../../src/domain/cube/types';
import { applyNxNMove, createNxNCube, isNxNSolved } from '../../../src/domain/nxn/cube';
import { NxNEngine } from '../../../src/domain/nxn/engine';
import { solveNxN, simplifyMoves, verifyNxNSolution } from '../../../src/solver/nxn/solveNxN';
import { handleSolveRequest } from '../../../src/solver/solveRequest';
import { random, scrambled, scrambledStickers } from './helpers';

/** Replay with the slow, independent domain rules. */
function replayWithDomain(state: CubeState, size: number, moves: ReturnType<typeof solveNxN>) {
  return moves.reduce((current, move) => applyNxNMove(current, size, move), state);
}

describe('reduction solver', () => {
  it.each([4, 5, 6, 7, 8, 9])('solves generated %i-layer cubes', (size) => {
    for (const seed of [1, 2, 3]) {
      const state = scrambled(size, seed * 101 + size);
      const moves = solveNxN(state, size);
      expect(verifyNxNSolution(state, size, moves)).toBe(true);
      if (size <= 6) expect(isNxNSolved(replayWithDomain(state, size, moves), size)).toBe(true);
    }
  });

  it.each([10, 13, 16, 20])('solves a %i-layer cube quickly', (size) => {
    const state = scrambled(size, 7 * size, 120);
    const started = performance.now();
    const moves = solveNxN(state, size);
    expect(verifyNxNSolution(state, size, moves)).toBe(true);
    expect(performance.now() - started).toBeLessThan(15_000);
  });

  it('returns no moves for a solved cube', () => {
    for (const size of [5, 6, 20]) expect(solveNxN(createNxNCube(size, true), size)).toEqual([]);
  });

  it('solves single turns of every kind, including inner slices that force parity fixes', () => {
    for (const size of [5, 6, 7]) {
      const engine = NxNEngine.for(size);
      for (const face of ['U', 'R', 'F', 'D'] as const)
        for (let layer = 0; layer < size; layer++) {
          const stickers = engine.fromState(createNxNCube(size, true));
          NxNEngine.apply(stickers, engine.perm(face, layer, 1));
          const state = engine.toState(stickers);
          expect(verifyNxNSolution(state, size, solveNxN(state, size))).toBe(true);
        }
    }
  });

  it('solves varied scramble lengths', () => {
    for (const [size, length] of [
      [5, 1],
      [5, 2],
      [6, 3],
      [7, 8],
      [8, 200],
    ] as const) {
      const state = scrambled(size, length * 13, length);
      expect(verifyNxNSolution(state, size, solveNxN(state, size))).toBe(true);
    }
  });

  it('rejects states that cannot occur on a real cube', () => {
    const size = 6;
    const engine = NxNEngine.for(size);
    const stickers = scrambledStickers(size, 5);
    const twisted = stickers.slice();
    // Swap two stickers of different colors: the result is not a reachable cube.
    const next = random(11);
    let a = 0;
    let b = 0;
    do {
      a = Math.floor(next() * engine.total);
      b = Math.floor(next() * engine.total);
    } while (twisted[a] === twisted[b]);
    [twisted[a], twisted[b]] = [twisted[b], twisted[a]];
    const state = engine.toState(twisted);
    try {
      const moves = solveNxN(state, size);
      // If the swap happened to be a legal state, the answer must still verify.
      expect(verifyNxNSolution(state, size, moves)).toBe(true);
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
    expect(() => solveNxN(engine.toState(stickers), 21)).toThrow();
    expect(() => solveNxN(createNxNCube(4), 4)).toThrow();
  });

  it('is reachable through the worker request handler for large sizes', () => {
    for (const size of [5, 8]) {
      const state = scrambled(size, 77);
      const response = handleSolveRequest({ state, size });
      expect(response.ok).toBe(true);
      if (response.ok) expect(verifyNxNSolution(state, size, response.moves as never)).toBe(true);
    }
    expect(handleSolveRequest({ state: createNxNCube(5), size: 5 })).toEqual({
      ok: false,
      error: 'Unable to calculate a verified solution.',
    });
  });
});

describe('simplifyMoves', () => {
  it('merges neighbouring turns of one layer, even across commuting layers', () => {
    const move = (face: 'U' | 'D' | 'R', layer: number, turns: 1 | -1 | 2) =>
      ({ face, layer, width: 1, turns }) as const;
    expect(simplifyMoves([move('U', 0, 1), move('U', 0, -1)], 5)).toEqual([]);
    expect(simplifyMoves([move('U', 1, 1), move('U', 2, 1), move('U', 1, 1)], 5)).toEqual([
      move('U', 1, 2),
      move('U', 2, 1),
    ]);
    // D layer 0 is U layer n-1, and is written from the nearer face.
    expect(simplifyMoves([move('U', 4, 1)], 5)).toEqual([move('D', 0, -1)]);
    expect(simplifyMoves([move('D', 0, 1), move('D', 0, 1)], 5)).toEqual([move('D', 0, 2)]);
  });

  it('never changes what the moves do', () => {
    for (const size of [5, 8]) {
      const next = random(size);
      const moves = Array.from({ length: 80 }, () => ({
        face: FACES[Math.floor(next() * 6)],
        layer: Math.floor(next() * size),
        width: 1,
        turns: ([1, -1, 2] as const)[Math.floor(next() * 3)],
      }));
      const engine = NxNEngine.for(size);
      const run = (list: typeof moves) => {
        const s = engine.fromState(createNxNCube(size, true));
        for (const m of list) NxNEngine.apply(s, engine.permOf(m));
        return s;
      };
      expect(run(simplifyMoves(moves, size))).toEqual(run(moves));
    }
  });
});
