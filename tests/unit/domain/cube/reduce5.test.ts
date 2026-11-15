import { describe, expect, it } from 'vitest';
import { applyNxNMove, createNxNCube } from '../../../../src/domain/nxn/cube';
import { areFiveEdgesPaired, reduce5To3 } from '../../../../src/domain/fiveByFive/reduce';

describe('5×5 reduction handoff', () => {
  it('extracts a valid 3×3 from a reduced outer-turn state', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 0,
      width: 1,
      turns: 1,
    });
    expect(areFiveEdgesPaired(cube)).toBe(true);
    expect(reduce5To3(cube).U).toHaveLength(9);
  });

  it('rejects an unreduced inner-turn state', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 1,
      width: 1,
      turns: 1,
    });
    expect(() => reduce5To3(cube)).toThrow();
  });
});
