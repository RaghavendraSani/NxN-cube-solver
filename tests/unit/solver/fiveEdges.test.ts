import { describe, expect, it } from 'vitest';
import { applyNxNMove, createNxNCube } from '../../../src/domain/nxn/cube';
import { parseMove5 } from '../../../src/domain/fiveByFive/notation';
import { findFiveEdgePairing, verifyFiveEdgePairing } from '../../../src/solver/fiveByFive/edges';

describe('5×5 edge pairing', () => {
  it('replay verifies pairing for an unpaired legal state', () => {
    const scramble = "U Fw U F' U' Fw' L F L' U'".split(' ').map(parseMove5);
    const cube = scramble.reduce(
      (state, move) => applyNxNMove(state, 5, move),
      createNxNCube(5, true),
    );
    const moves = findFiveEdgePairing(cube, 1, 1000);
    expect(moves).not.toBeNull();
    expect(verifyFiveEdgePairing(cube, moves!)).toBe(true);
  });
});
