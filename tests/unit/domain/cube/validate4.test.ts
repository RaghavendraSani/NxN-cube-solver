// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createNxNCube, applyNxNMove, toNxNCoordinates } from '../../../../src/domain/nxn/cube';
import { check4Entry } from '../../../../src/domain/nxn/validate4';
import { FACES } from '../../../../src/domain/cube/faces';
import type { FaceletAddress } from '../../../../src/domain/cube/coordinates';
import type { Face } from '../../../../src/domain/cube/faces';
import type { Color } from '../../../../src/domain/cube/colors';

describe('4x4 preliminary entry checks', () => {
  it('identifies missing stickers and incorrect color counts', () => {
    expect(check4Entry(createNxNCube(4))).toEqual({ status: 'incomplete' });
    const cube = createNxNCube(4, true);
    expect(check4Entry({ ...cube, U: Array(16).fill('red') })).toEqual({ status: 'color-count' });
  });
  it('accepts counts after legal outer, inner, and wide turns without claiming solvability', () => {
    let cube = createNxNCube(4, true);
    for (const move of [
      { face: 'R', layer: 0, width: 1, turns: 1 },
      { face: 'U', layer: 1, width: 1, turns: -1 },
      { face: 'F', layer: 0, width: 2, turns: 2 },
    ] as const)
      cube = applyNxNMove(cube, 4, move);
    expect(check4Entry(cube)).toEqual({ status: 'counts-ok' });
  });
  it('rejects a mirrored corner even when the color counts are correct', () => {
    const cube = createNxNCube(4, true);
    const U = [...cube.U],
      R = [...cube.R];
    [U[15], R[0]] = [R[0], U[15]];
    expect(check4Entry({ ...cube, U, R })).toEqual({ status: 'corner-piece' });
  });
  it('rejects a single twisted corner', () => {
    const cube = createNxNCube(4, true);
    const U = [...cube.U],
      R = [...cube.R],
      F = [...cube.F];
    [U[15], R[0], F[3]] = [R[0], F[3], U[15]];
    expect(check4Entry({ ...cube, U, R, F })).toEqual({ status: 'corner-orientation' });
  });
  it('rejects invalid corner and wing combinations while preserving color counts', () => {
    const cube = createNxNCube(4, true);
    const R = [...cube.R],
      F = [...cube.F];
    [R[0], F[0]] = [F[0], R[0]];
    expect(check4Entry({ ...cube, R, F })).toEqual({ status: 'corner-piece' });
    const U = [...cube.U],
      D = [...cube.D];
    [U[1], D[1]] = [D[1], U[1]];
    expect(check4Entry({ ...cube, U, D })).toEqual({ status: 'wing-piece' });
  });
  it('rejects a single wing flipped in place even though its colors and global counts match', () => {
    const cube = createNxNCube(4, true);
    const U = [...cube.U],
      B = [...cube.B];
    [U[1], B[2]] = [B[2], U[1]];
    expect(check4Entry({ ...cube, U, B })).toEqual({ status: 'wing-piece' });
  });
  it('rejects a single twisted corner and a single flipped wing at every position', () => {
    const pieces = new Map<string, FaceletAddress[]>();
    for (const face of FACES)
      for (let row = 0; row < 4; row++)
        for (let column = 0; column < 4; column++) {
          const address = { face, row, column };
          const key = toNxNCoordinates(address, 4).position.join(',');
          pieces.set(key, [...(pieces.get(key) ?? []), address]);
        }
    let cornerCount = 0,
      wingCount = 0;
    for (const group of pieces.values()) {
      if (group.length !== 2 && group.length !== 3) continue;
      const solved = createNxNCube(4, true);
      const copy = Object.fromEntries(FACES.map((face) => [face, [...solved[face]]])) as Record<
        Face,
        Color[]
      >;
      const values = group.map(({ face, row, column }) => copy[face][row * 4 + column]);
      group.forEach(({ face, row, column }, index) => {
        copy[face][row * 4 + column] = values[(index + 1) % group.length];
      });
      if (group.length === 3) {
        cornerCount++;
        expect(check4Entry(copy)).toEqual({ status: 'corner-orientation' });
      } else {
        wingCount++;
        expect(check4Entry(copy)).toEqual({ status: 'wing-piece' });
      }
    }
    expect(cornerCount).toBe(8);
    expect(wingCount).toBe(24);
  });
  it('accepts piece combinations through many deterministic legal moves', () => {
    let cube = createNxNCube(4, true),
      seed = 123456;
    for (let i = 0; i < 1200; i++) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const face = FACES[(seed >>> 16) % 6];
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const mode = (seed >>> 8) % 3;
      cube = applyNxNMove(cube, 4, {
        face,
        layer: mode === 1 ? 1 : 0,
        width: mode === 2 ? 2 : 1,
        turns: ([1, -1, 2] as const)[(seed >>> 12) % 3],
      });
      expect(check4Entry(cube)).toEqual({ status: 'counts-ok' });
    }
  });
  it('accepts all 24 orientations of the fixed color scheme', () => {
    const queue = [createNxNCube(4, true)];
    const seen = new Set<string>();
    while (queue.length > 0) {
      const cube = queue.shift()!;
      const key = FACES.map((face) => cube[face][0]).join(',');
      if (seen.has(key)) continue;
      seen.add(key);
      expect(check4Entry(cube)).toEqual({ status: 'counts-ok' });
      for (const face of ['R', 'U', 'F'] as const)
        queue.push(applyNxNMove(cube, 4, { face, layer: 0, width: 4, turns: 1 }));
    }
    expect(seen.size).toBe(24);
  });
});
