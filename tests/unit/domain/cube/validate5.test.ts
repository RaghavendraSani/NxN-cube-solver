import { describe, expect, it } from 'vitest';
import { applyNxNMove, createNxNCube } from '../../../../src/domain/nxn/cube';
import { check5Entry } from '../../../../src/domain/fiveByFive/validate';
import { pieces5 } from '../../../../src/domain/fiveByFive/pieces';
import { FACES } from '../../../../src/domain/cube/faces';
import type { Color } from '../../../../src/domain/cube/colors';
import type { Face } from '../../../../src/domain/cube/faces';

describe('5×5 preliminary entry checks', () => {
  it('accepts a solved cube and a legal mixed-layer scramble', () => {
    let cube = createNxNCube(5, true);
    expect(check5Entry(cube)).toEqual({ status: 'checks-ok' });
    for (const move of [
      { face: 'R', layer: 0, width: 1, turns: 1 },
      { face: 'U', layer: 1, width: 1, turns: -1 },
      { face: 'F', layer: 0, width: 2, turns: 2 },
    ] as const)
      cube = applyNxNMove(cube, 5, move);
    expect(check5Entry(cube)).toEqual({ status: 'checks-ok' });
  });

  it('rejects missing stickers and wrong color counts', () => {
    expect(check5Entry(createNxNCube(5))).toEqual({ status: 'incomplete' });
    const cube = createNxNCube(5, true);
    expect(check5Entry({ ...cube, U: Array(25).fill('red') })).toEqual({ status: 'color-count' });
  });

  it('rejects reflected fixed centers while preserving counts', () => {
    const cube = createNxNCube(5, true);
    const R = [...cube.R],
      L = [...cube.L];
    [R[12], L[12]] = [L[12], R[12]];
    expect(check5Entry({ ...cube, R, L })).toEqual({ status: 'centers' });
  });

  it('rejects a wing with impossible colors while preserving counts', () => {
    const cube = createNxNCube(5, true);
    const U = [...cube.U],
      D = [...cube.D];
    [U[1], D[1]] = [D[1], U[1]];
    expect(check5Entry({ ...cube, U, D })).toEqual({ status: 'wing-piece' });
  });

  it('rejects a center exchanged between its X and T orbits', () => {
    const cube = createNxNCube(5, true);
    const U = [...cube.U],
      R = [...cube.R];
    [U[6], R[7]] = [R[7], U[6]];
    expect(check5Entry({ ...cube, U, R })).toEqual({ status: 'center-orbit' });
  });

  it('accepts a whole-cube rotation of the color scheme', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 0,
      width: 5,
      turns: 1,
    });
    expect(check5Entry(cube)).toEqual({ status: 'checks-ok' });
  });

  it('rejects a single twisted corner', () => {
    const cube = createNxNCube(5, true);
    const U = [...cube.U],
      R = [...cube.R],
      F = [...cube.F];
    [U[24], R[0], F[4]] = [R[0], F[4], U[24]];
    expect(check5Entry({ ...cube, U, R, F })).toEqual({ status: 'corner-orientation' });
  });

  it('rejects a single wing flipped in place', () => {
    const solved = createNxNCube(5, true);
    const cube = Object.fromEntries(FACES.map((face) => [face, [...solved[face]]])) as Record<
      Face,
      Color[]
    >;
    const [a, b] = pieces5().wings[0];
    [cube[a.face][a.row * 5 + a.column], cube[b.face][b.row * 5 + b.column]] = [
      cube[b.face][b.row * 5 + b.column],
      cube[a.face][a.row * 5 + a.column],
    ];
    expect(check5Entry(cube)).toEqual({ status: 'wing-piece' });
  });

  it('accepts representative turns of each layer', () => {
    for (const face of FACES)
      for (const layer of [0, 1, 2]) {
        const cube = applyNxNMove(createNxNCube(5, true), 5, { face, layer, width: 1, turns: 1 });
        expect(check5Entry(cube)).toEqual({ status: 'checks-ok' });
      }
  });
});
