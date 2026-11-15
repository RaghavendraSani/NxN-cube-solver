// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { applyNxNMove, createNxNCube } from '../../../src/domain/nxn/cube';
import { areFiveCentersSolved, findFiveCenterMoves } from '../../../src/solver/fiveByFive/centers';
import { parseMove5 } from '../../../src/domain/fiveByFive/notation';

describe('5×5 center reduction', () => {
  it('solves centers after a legal inner turn', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 1,
      width: 1,
      turns: 1,
    });
    const moves = findFiveCenterMoves(cube, 1);
    expect(moves).not.toBeNull();
    expect(
      areFiveCentersSolved(moves!.reduce((state, move) => applyNxNMove(state, 5, move), cube)),
    ).toBe(true);
  });

  it('reports exhaustion without claiming success', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 1,
      width: 1,
      turns: 1,
    });
    expect(findFiveCenterMoves(cube, 0)).toBeNull();
  });

  it('solves 5 random 20-move inner slice scrambles', () => {
    const innerMoves = ['2R', '2L', '2U', '2D', '2F', '2B']
      .flatMap((f) => [`${f}`, `${f}'`, `${f}2`])
      .map(parseMove5);

    for (let i = 0; i < 5; i++) {
      let cube = createNxNCube(5, true);
      for (let step = 0; step < 20; step++) {
        cube = applyNxNMove(cube, 5, innerMoves[Math.floor(Math.random() * innerMoves.length)]);
      }
      const moves = findFiveCenterMoves(cube);
      expect(moves).not.toBeNull();
      const replayed = moves!.reduce((state, move) => applyNxNMove(state, 5, move), cube);
      expect(areFiveCentersSolved(replayed)).toBe(true);
    }
  });
});
