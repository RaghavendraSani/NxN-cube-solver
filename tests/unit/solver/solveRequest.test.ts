// @vitest-environment node
import { describe, expect, it, vi, afterEach } from 'vitest';
import { createNxNCube, applyNxNMove } from '../../../src/domain/nxn/cube';
import * as four from '../../../src/solver/fourByFour/solver';
import { handleSolveRequest } from '../../../src/solver/solveRequest';

afterEach(() => vi.restoreAllMocks());

describe('worker request handling', () => {
  it('returns verified 4x4 success and rejects incomplete input', () => {
    expect(handleSolveRequest({ size: 4, state: createNxNCube(4, true) })).toEqual({
      ok: true,
      moves: [],
    });
    expect(handleSolveRequest({ size: 4, state: createNxNCube(4) })).toEqual({
      ok: false,
      error: 'Unable to calculate a verified solution.',
    });
  });
  it('rejects a corrupted 4x4 solver response', () => {
    const state = applyNxNMove(createNxNCube(4, true), 4, {
      face: 'R',
      layer: 0,
      width: 1,
      turns: 1,
    });
    vi.spyOn(four, 'solveFour').mockReturnValue([]);
    expect(handleSolveRequest({ size: 4, state })).toEqual({
      ok: false,
      error: 'Unable to calculate a verified solution.',
    });
  });
});
