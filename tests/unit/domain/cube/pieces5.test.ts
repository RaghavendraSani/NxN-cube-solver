import { describe, expect, it } from 'vitest';
import { pieces5 } from '../../../../src/domain/fiveByFive/pieces';
import { applyNxNMove, createNxNCube } from '../../../../src/domain/nxn/cube';

describe('5×5 piece positions', () => {
  it('groups every facelet into the correct physical orbit', () => {
    const pieces = pieces5();
    expect(pieces.fixedCenters).toHaveLength(6);
    expect(pieces.xCenters).toHaveLength(24);
    expect(pieces.tCenters).toHaveLength(24);
    expect(pieces.middleEdges).toHaveLength(12);
    expect(pieces.wings).toHaveLength(24);
    expect(pieces.corners).toHaveLength(8);
    const stickers = Object.values(pieces).flat(2);
    expect(stickers).toHaveLength(150);
    expect(new Set(stickers.map(({ face, row, column }) => `${face}:${row}:${column}`)).size).toBe(
      150,
    );
  });

  it('preserves each center orbit under a legal inner turn', () => {
    const solved = createNxNCube(5, true);
    const turned = applyNxNMove(solved, 5, { face: 'R', layer: 1, width: 1, turns: 1 });
    const groups = pieces5();
    for (const pieces of [groups.fixedCenters, groups.xCenters, groups.tCenters]) {
      const colors = (state: typeof solved) =>
        pieces.map(([{ face, row, column }]) => state[face][row * 5 + column]).sort();
      expect(colors(turned)).toEqual(colors(solved));
    }
  });
});
