// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createNxNCube } from '../../../src/domain/nxn/cube';
import { check5Entry } from '../../../src/domain/fiveByFive/validate';
import { solveFive } from '../../../src/solver/fiveByFive/solver';
import { verifyNxNSolution } from '../../../src/solver/nxn/solveNxN';
import { scrambled } from './helpers';

describe('5×5 entry points', () => {
  it('validate and solve generated cubes', () => {
    for (const seed of [1, 2, 3, 4]) {
      const state = scrambled(5, seed);
      expect(check5Entry(state)).toBe('counts-ok');
      expect(verifyNxNSolution(state, 5, solveFive(state))).toBe(true);
    }
    expect(check5Entry(createNxNCube(5))).toBe('incomplete');
  });
});
