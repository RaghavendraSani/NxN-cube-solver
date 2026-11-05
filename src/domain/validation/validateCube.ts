import type { Face } from '../cube/faces';
import { FACES } from '../cube/faces';
import type { Color } from '../cube/colors';
import { createSolvedCube } from '../cube/state';
import type { CubeState } from '../cube/types';

type Reason =
  | 'incomplete'
  | 'color-count'
  | 'centers'
  | 'corner-piece'
  | 'edge-piece'
  | 'corner-orientation'
  | 'edge-orientation'
  | 'parity';
export type ValidationResult = { valid: true } | { valid: false; reason: Reason };
type Sticker = readonly [Face, number];

// Each corner starts with its U/D facelet; the remaining two run in a consistent
// handed order. Each edge lists U/D first, or F/B first for middle-layer edges.
const CORNERS: readonly (readonly Sticker[])[] = [
  [
    ['U', 8],
    ['R', 0],
    ['F', 2],
  ],
  [
    ['U', 6],
    ['F', 0],
    ['L', 2],
  ],
  [
    ['U', 0],
    ['L', 0],
    ['B', 2],
  ],
  [
    ['U', 2],
    ['B', 0],
    ['R', 2],
  ],
  [
    ['D', 2],
    ['F', 8],
    ['R', 6],
  ],
  [
    ['D', 0],
    ['L', 8],
    ['F', 6],
  ],
  [
    ['D', 6],
    ['B', 8],
    ['L', 6],
  ],
  [
    ['D', 8],
    ['R', 8],
    ['B', 6],
  ],
];
const EDGES: readonly (readonly Sticker[])[] = [
  [
    ['U', 5],
    ['R', 1],
  ],
  [
    ['U', 7],
    ['F', 1],
  ],
  [
    ['U', 3],
    ['L', 1],
  ],
  [
    ['U', 1],
    ['B', 1],
  ],
  [
    ['D', 5],
    ['R', 7],
  ],
  [
    ['D', 1],
    ['F', 7],
  ],
  [
    ['D', 3],
    ['L', 7],
  ],
  [
    ['D', 7],
    ['B', 7],
  ],
  [
    ['F', 5],
    ['R', 3],
  ],
  [
    ['F', 3],
    ['L', 5],
  ],
  [
    ['B', 5],
    ['L', 3],
  ],
  [
    ['B', 3],
    ['R', 5],
  ],
];

function permutationParity(permutation: readonly number[]): number {
  let inversions = 0;
  for (let i = 0; i < permutation.length; i++)
    for (let j = i + 1; j < permutation.length; j++)
      if (permutation[i] > permutation[j]) inversions++;
  return inversions % 2;
}

export function validateCube(state: CubeState): ValidationResult {
  if (
    FACES.some(
      (face) => state[face].length !== 9 || state[face].some((color) => color === 'unassigned'),
    )
  ) {
    return { valid: false, reason: 'incomplete' };
  }
  const counts = new Map<Color, number>();
  for (const face of FACES)
    for (const color of state[face]) counts.set(color, (counts.get(color) ?? 0) + 1);
  const solved = createSolvedCube();
  if (FACES.some((face) => counts.get(solved[face][4]) !== 9))
    return { valid: false, reason: 'color-count' };
  if (FACES.some((face) => state[face][4] !== solved[face][4]))
    return { valid: false, reason: 'centers' };

  const cornerPermutation: number[] = [];
  let cornerOrientation = 0;
  for (const position of CORNERS) {
    const colors = position.map(([face, index]) => state[face][index]);
    const orientation = colors.findIndex((color) => color === 'white' || color === 'yellow');
    if (orientation < 0) return { valid: false, reason: 'corner-piece' };
    const piece = CORNERS.findIndex((stickers) =>
      stickers.every(([face], i) => colors[(orientation + i) % 3] === solved[face][4]),
    );
    if (piece < 0 || cornerPermutation.includes(piece))
      return { valid: false, reason: 'corner-piece' };
    cornerPermutation.push(piece);
    cornerOrientation += orientation;
  }

  const edgePermutation: number[] = [];
  let edgeOrientation = 0;
  for (const position of EDGES) {
    const colors = position.map(([face, index]) => state[face][index]);
    const piece = EDGES.findIndex((stickers) => {
      const expected = stickers.map(([face]) => solved[face][4]);
      return (
        (colors[0] === expected[0] && colors[1] === expected[1]) ||
        (colors[0] === expected[1] && colors[1] === expected[0])
      );
    });
    if (piece < 0 || edgePermutation.includes(piece)) return { valid: false, reason: 'edge-piece' };
    edgePermutation.push(piece);
    if (colors[0] !== solved[EDGES[piece][0][0]][4]) edgeOrientation++;
  }
  if (cornerOrientation % 3 !== 0) return { valid: false, reason: 'corner-orientation' };
  if (edgeOrientation % 2 !== 0) return { valid: false, reason: 'edge-orientation' };
  if (permutationParity(cornerPermutation) !== permutationParity(edgePermutation))
    return { valid: false, reason: 'parity' };
  return { valid: true };
}
