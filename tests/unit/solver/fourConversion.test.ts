// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { createNxNCube, applyNxNMove } from '../../../src/domain/nxn/cube';
import type { Face } from '../../../src/domain/cube/faces';
import {
  faceletColoursOf444,
  SOLVED_444_STATE,
} from '../../../vendor/cubesmith/src/puzzles/444/state';
import type { Color } from '../../../src/domain/cube/colors';
import { convertFourState, type FourSolverLayout } from '../../../src/solver/fourByFour/convert';

// Slot identifiers from @cubesmith/scrambler 0.15.0 (MIT); kept as a compatibility fixture.
const names =
  'U00 U10 U20 U30 U01 U11 U21 U31 U02 U12 U22 U32 U03 U13 U23 U33 D30 D20 D10 D00 D31 D21 D11 D01 D32 D22 D12 D02 D33 D23 D13 D03 F30 F20 F10 F00 F31 F21 F11 F01 F32 F22 F12 F02 F33 F23 F13 F03 B33 B23 B13 B03 B32 B22 B12 B02 B31 B21 B11 B01 B30 B20 B10 B00 R33 R32 R31 R30 R23 R22 R21 R20 R13 R12 R11 R10 R03 R02 R01 R00 L30 L31 L32 L33 L20 L21 L22 L23 L10 L11 L12 L13 L00 L01 L02 L03'.split(
    ' ',
  );
const layout: FourSolverLayout = {
  faces: ['U', 'D', 'F', 'B', 'L', 'R'],
  facelets: names.map((name) => ({
    face: name[0] as Face,
    row: Number(name[1]),
    column: Number(name[2]),
  })),
  corners: [
    [15, 79, 47],
    [3, 35, 95],
    [0, 92, 51],
    [12, 63, 76],
    [31, 44, 67],
    [19, 83, 32],
    [16, 48, 80],
    [28, 64, 60],
  ],
  wings: [
    [14, 78],
    [77, 13],
    [43, 11],
    [7, 39],
    [94, 2],
    [1, 93],
    [8, 59],
    [55, 4],
    [66, 30],
    [29, 65],
    [27, 40],
    [36, 23],
    [18, 82],
    [81, 17],
    [56, 24],
    [20, 52],
    [75, 46],
    [45, 71],
    [34, 91],
    [87, 33],
    [88, 50],
    [49, 84],
    [62, 72],
    [68, 61],
  ],
  centers: [
    10, 9, 6, 5, 26, 25, 22, 21, 42, 41, 38, 37, 58, 57, 54, 53, 90, 89, 86, 85, 74, 73, 70, 69,
  ],
};

describe('4x4 solver conversion', () => {
  it('converts the solved cube to the solver identity state', () => {
    const state = convertFourState(createNxNCube(4, true), layout);
    expect(state.cornerPermutation).toEqual(Array.from({ length: 8 }, (_, i) => i));
    expect(state.cornerOrientation).toEqual(Array(8).fill(0));
    expect(state.wingPermutation).toEqual(Array.from({ length: 24 }, (_, i) => i));
    expect(state.centreColour).toEqual(
      layout.centers.map((id) => layout.faces.indexOf(layout.facelets[id].face)),
    );
  });
  it('accepts legal states and rejects an invalid wing or malformed layout', () => {
    const cube = createNxNCube(4, true);
    expect(
      convertFourState(applyNxNMove(cube, 4, { face: 'R', layer: 0, width: 2, turns: 1 }), layout)
        .wingPermutation,
    ).toHaveLength(24);
    const U = [...cube.U],
      B = [...cube.B];
    [U[1], B[2]] = [B[2], U[1]];
    expect(() => convertFourState({ ...cube, U, B }, layout)).toThrow();
    expect(() => convertFourState(cube, { ...layout, centers: [] })).toThrow();
  });
  it('round-trips 200 independently assembled piece states including arbitrary center arrangements', () => {
    let seed = 96173;
    /** Generate a repeatable index so failures can be reproduced. */
    function random(n: number) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return Math.floor((seed / 0x100000000) * n);
    }
    /** Shuffle a copy without changing the solved-state fixture. */
    function shuffled(values: readonly number[]) {
      const result = [...values];
      for (let i = result.length - 1; i > 0; i--) {
        const j = random(i + 1);
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }
    const solved = createNxNCube(4, true);
    for (let sample = 0; sample < 200; sample++) {
      const orientations = Array.from({ length: 7 }, () => random(3));
      orientations.push((3 - (orientations.reduce((a, b) => a + b, 0) % 3)) % 3);
      const original = {
        cornerPermutation: shuffled(SOLVED_444_STATE.cornerPermutation),
        cornerOrientation: orientations,
        wingPermutation: shuffled(SOLVED_444_STATE.wingPermutation),
        centreColour: shuffled(SOLVED_444_STATE.centreColour),
      };
      const colors = faceletColoursOf444(original);
      const cube = Object.fromEntries(
        Object.entries(solved).map(([face, values]) => [face, [...values]]),
      ) as Record<Face, Color[]>;
      layout.facelets.forEach(({ face, row, column }, index) => {
        cube[face][row * 4 + column] = solved[layout.faces[colors[index]]][0];
      });
      expect(convertFourState(cube, layout)).toEqual(original);
    }
  });
});
