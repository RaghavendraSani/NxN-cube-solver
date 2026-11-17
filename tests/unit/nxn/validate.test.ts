// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createNxNCube } from '../../../src/domain/nxn/cube';
import { NxNEngine } from '../../../src/domain/nxn/engine';
import { NxNStructure } from '../../../src/domain/nxn/orbits';
import { checkNxNEntry } from '../../../src/domain/nxn/validate';
import { formatMoveN, parseMoveN } from '../../../src/domain/nxn/notation';
import { solveNxN, verifyNxNSolution } from '../../../src/solver/nxn/solveNxN';
import { random, scrambledStickers } from './helpers';

const status = (size: number, stickers: Uint8Array) =>
  checkNxNEntry(NxNEngine.for(size).toState(stickers), size);

function swap(stickers: Uint8Array, a: number, b: number) {
  const out = stickers.slice();
  [out[a], out[b]] = [out[b], out[a]];
  return out;
}

/** Stickers of the piece at one position, in index order. */
function piecesOf(size: number, kind: 'corner' | 'wing') {
  const engine = NxNEngine.for(size);
  const structure = NxNStructure.for(size);
  const map = new Map<string, number[]>();
  for (let i = 0; i < engine.total; i++)
    if (structure.kind[i] === kind) {
      const key = engine.positionKey(i);
      map.set(key, [...(map.get(key) ?? []), i]);
    }
  return [...map.values()];
}

describe('N×N entry validation', () => {
  it.each([5, 6, 7, 8, 12, 20])('accepts solved and scrambled %i-layer cubes', (size) => {
    const engine = NxNEngine.for(size);
    expect(status(size, engine.fromState(createNxNCube(size, true)))).toBe('counts-ok');
    for (const seed of [1, 2, 3])
      expect(status(size, scrambledStickers(size, seed))).toBe('counts-ok');
  });

  it('reports incomplete entries and wrong color totals', () => {
    for (const size of [5, 6]) {
      expect(checkNxNEntry(createNxNCube(size), size)).toBe('incomplete');
      const stickers = NxNEngine.for(size).fromState(createNxNCube(size, true));
      const wrong = stickers.slice();
      wrong[0] = (wrong[0] + 1) % 6;
      expect(status(size, wrong)).toBe('color-count');
    }
  });

  it.each([5, 6, 7])('rejects every kind of impossible %i-layer cube', (size) => {
    const engine = NxNEngine.for(size);
    const structure = NxNStructure.for(size);
    const base = scrambledStickers(size, 9);
    // A center swapped with a wing keeps color totals but breaks the center groups.
    const center = structure.centerOrbits.find((o) => o.length === 24)![0];
    const wing = base.findIndex((c, i) => structure.kind[i] === 'wing' && c !== base[center]);
    expect(status(size, swap(base, center, wing))).toBe('center-count');
    // Swapping stickers between two corners.
    const corners = piecesOf(size, 'corner');
    const [a, b] = [corners[0][0], corners.find((c) => base[c[0]] !== base[corners[0][0]])![0]];
    expect(status(size, swap(base, a, b))).not.toBe('counts-ok');
    // Rotating the colors of one corner twists it.
    const twisted = base.slice();
    const [x, y, z] = corners[3];
    [twisted[x], twisted[y], twisted[z]] = [base[z], base[x], base[y]];
    expect(status(size, twisted)).toBe('corner-orientation');
    // Two stickers of different wings.
    const wings = piecesOf(size, 'wing');
    const w1 = wings[0][0];
    const w2 = wings.find((w) => base[w[0]] !== base[w1] && base[w[1]] !== base[w1])![0];
    expect(status(size, swap(base, w1, w2))).not.toBe('counts-ok');
    void engine;
  });

  it.each([5, 7])(
    'rejects flipped and parity-violating middle edges on a %i-layer cube',
    (size) => {
      const structure = NxNStructure.for(size);
      const base = NxNEngine.for(size).fromState(createNxNCube(size, true));
      const middle = structure.wingPieceOrbits.find((o) => o.offset === 0)!;
      const [first, second] = middle.pieces;
      expect(status(size, swap(base, first[0], first[1]))).toBe('edge-orientation');
      // Exchange two whole middle edges: valid pieces, but the parity no longer fits the corners.
      const swapped = swap(swap(base, first[0], second[0]), first[1], second[1]);
      expect(['parity', 'edge-orientation']).toContain(status(size, swapped));
      // Exchanging the fixed centers of two faces breaks the center scheme.
      const centers = structure.centerOrbits.find((o) => o.length === 6)!;
      expect(status(size, swap(base, centers[0], centers[1]))).not.toBe('counts-ok');
    },
  );

  it('agrees with the solver: accepted states solve, corrupted ones that pass are legal', () => {
    for (const size of [5, 6, 7]) {
      const engine = NxNEngine.for(size);
      const next = random(size * 17);
      let accepted = 0;
      for (let trial = 0; trial < 150; trial++) {
        const base = scrambledStickers(size, trial + 1, 30);
        const a = Math.floor(next() * engine.total);
        const b = Math.floor(next() * engine.total);
        if (base[a] === base[b]) continue;
        const state = engine.toState(swap(base, a, b));
        if (checkNxNEntry(state, size) !== 'counts-ok') continue;
        accepted++;
        expect(verifyNxNSolution(state, size, solveNxN(state, size))).toBe(true);
      }
      expect(accepted).toBeGreaterThan(0);
    }
  });
});

describe('N×N notation', () => {
  it('formats and parses layer ranges', () => {
    const cases = [
      ['R', { face: 'R', layer: 0, width: 1, turns: 1 }],
      ["2U'", { face: 'U', layer: 1, width: 1, turns: -1 }],
      ['10F2', { face: 'F', layer: 9, width: 1, turns: 2 }],
      ['Lw', { face: 'L', layer: 0, width: 2, turns: 1 }],
      ["3Bw'", { face: 'B', layer: 0, width: 3, turns: -1 }],
      ['2-4D', { face: 'D', layer: 1, width: 3, turns: 1 }],
    ] as const;
    for (const [text, move] of cases) {
      expect(formatMoveN(move)).toBe(text);
      expect(parseMoveN(text)).toEqual(move);
    }
    for (const bad of ['', 'X', '0R', 'Rw2w', '3-2R', '2-3Rw'])
      expect(() => parseMoveN(bad)).toThrow();
    expect(() => formatMoveN({ face: 'R', layer: -1, width: 1, turns: 1 })).toThrow();
  });
});
