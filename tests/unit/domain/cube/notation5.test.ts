import { describe, expect, it } from 'vitest';
import { formatMove5, parseMove5 } from '../../../../src/domain/fiveByFive/notation';

describe('5×5 move notation', () => {
  it.each([
    ['R', { face: 'R', layer: 0, width: 1, turns: 1 }],
    ["2U'", { face: 'U', layer: 1, width: 1, turns: -1 }],
    ['3F2', { face: 'F', layer: 2, width: 1, turns: 2 }],
    ['Rw', { face: 'R', layer: 0, width: 2, turns: 1 }],
    ["3Bw'", { face: 'B', layer: 0, width: 3, turns: -1 }],
  ] as const)('round-trips %s', (text, move) => {
    expect(parseMove5(text)).toEqual(move);
    expect(formatMove5(move)).toBe(text);
  });

  it('rejects unsupported and ambiguous layer ranges', () => {
    for (const text of ['1R', '2Rw', '4R', '4Rw', '3R3', 'r']) {
      expect(() => parseMove5(text)).toThrow();
    }
    expect(() => formatMove5({ face: 'R', layer: 1, width: 2, turns: 1 })).toThrow();
  });
});
