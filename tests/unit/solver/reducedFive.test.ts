// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyNxNMove, createNxNCube, isNxNSolved } from '../../../src/domain/nxn/cube';
import { solveReducedFive } from '../../../src/solver/fiveByFive/reducedSolver';
import { solveFive } from '../../../src/solver/fiveByFive/solver';

describe('reduced 5×5 solver', () => {
  it('replays the combined stages for a legal inner-layer scramble', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 1,
      width: 1,
      turns: 1,
    });
    const moves = solveFive(cube);
    expect(
      isNxNSolved(
        moves.reduce((state, move) => applyNxNMove(state, 5, move), cube),
        5,
      ),
    ).toBe(true);
  });

  it('solves an already reduced outer-turn scramble', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 0,
      width: 1,
      turns: 1,
    });
    const moves = solveReducedFive(cube);
    expect(
      isNxNSolved(
        moves.reduce((state, move) => applyNxNMove(state, 5, move), cube),
        5,
      ),
    ).toBe(true);
  });

  it('rejects a cube that has not been reduced', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 1,
      width: 1,
      turns: 1,
    });
    expect(() => solveReducedFive(cube)).toThrow();
  });
});
