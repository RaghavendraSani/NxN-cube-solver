import { FACES, type Face } from '../cube/faces';
import { countColors, PALETTE_COLORS } from '../cube/inputState';
import type { Color } from '../cube/colors';
import type { CubeState } from '../cube/types';
import { validateCube } from '../threeByThree/validate';

const edgeTriples = [
  [1, 2, 3],
  [5, 10, 15],
  [9, 14, 19],
  [21, 22, 23],
] as const;

/** Check whether all edge triples have matching assigned stickers on both faces. */
export function areFiveEdgesPaired(state: CubeState): boolean {
  return FACES.every(
    (face) =>
      state[face].length === 25 &&
      edgeTriples.every(
        ([a, b, c]) =>
          state[face][a] !== 'unassigned' &&
          state[face][a] === state[face][b] &&
          state[face][b] === state[face][c],
      ),
  );
}

/** Extract a 3×3 only when centers and edge triples form a valid reduced cube. */
export function reduce5To3(state: CubeState): CubeState {
  if (FACES.some((face) => state[face].length !== 25 || state[face].includes('unassigned')))
    throw new Error('Incomplete 5x5 cube.');
  const counts = countColors(state);
  if (PALETTE_COLORS.some((color) => counts[color] !== 25))
    throw new Error('Invalid 5x5 color counts.');
  if (!areFiveEdgesPaired(state)) throw new Error('5x5 edges are not paired.');

  const reduced = {} as Record<Face, Color[]>;
  for (const face of FACES) {
    const stickers = state[face];
    const center = stickers[12];
    for (const index of [6, 7, 8, 11, 12, 13, 16, 17, 18])
      if (stickers[index] !== center) throw new Error('5x5 centers are not reduced.');
    reduced[face] = [0, 2, 4, 10, 12, 14, 20, 22, 24].map((index) => stickers[index]);
  }
  if (!validateCube(reduced).valid) throw new Error('Invalid reduced 3x3 state.');
  return reduced;
}
