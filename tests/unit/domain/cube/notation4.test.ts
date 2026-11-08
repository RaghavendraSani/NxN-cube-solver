import { describe, expect, it } from 'vitest';
import { formatMove4, parseMove4 } from '../../../../src/domain/nxn/notation4';
import { FACES } from '../../../../src/domain/cube/faces';

describe('4x4 notation', () => {
  it('round-trips outer, inner, and wide moves for every face and turn', () => {
    for (const face of FACES)
      for (const [layer, width] of [
        [0, 1],
        [1, 1],
        [0, 2],
      ])
        for (const turns of [1, -1, 2] as const) {
          const move = { face, layer, width, turns };
          expect(parseMove4(formatMove4(move))).toEqual(move);
        }
  });
  it('uses unambiguous standard outer, 2R inner, and Rw wide notation', () => {
    expect(formatMove4({ face: 'R', layer: 0, width: 1, turns: -1 })).toBe("R'");
    expect(formatMove4({ face: 'R', layer: 1, width: 1, turns: 2 })).toBe('2R2');
    expect(formatMove4({ face: 'R', layer: 0, width: 2, turns: 1 })).toBe('Rw');
    expect(() => parseMove4('3Rw')).toThrow();
  });
});
