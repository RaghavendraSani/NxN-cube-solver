import { FACES, type Face } from './faces';
import type { Color } from './colors';
import { createSolvedCube } from './state';
import type { CubeState } from './types';

/** Map sticker colors to the face bearing their center, accepting proper cube rotations only. */
export function centerMapping(state: CubeState): Map<Color, Face> | null {
  const normals: Record<string, readonly [number, number, number]> = {
    red: [1, 0, 0],
    orange: [-1, 0, 0],
    white: [0, 1, 0],
    yellow: [0, -1, 0],
    green: [0, 0, 1],
    blue: [0, 0, -1],
  };
  const centers = FACES.map((face) => state[face][4]);
  if (new Set(centers).size !== 6 || centers.some((color) => !normals[color])) return null;
  const opposite = (a: Face, b: Face) =>
    normals[state[a][4]].every((v, i) => v === -normals[state[b][4]][i]);
  if (!opposite('U', 'D') || !opposite('R', 'L') || !opposite('F', 'B')) return null;
  const r = normals[state.R[4]],
    u = normals[state.U[4]],
    f = normals[state.F[4]];
  const cross = [r[1] * u[2] - r[2] * u[1], r[2] * u[0] - r[0] * u[2], r[0] * u[1] - r[1] * u[0]];
  if (!cross.every((value, i) => value === f[i])) return null;
  return new Map(FACES.map((face) => [state[face][4], face]));
}

export function normalizeColors(state: CubeState, mapping: Map<Color, Face>): CubeState {
  const solved = createSolvedCube();
  const convert = (face: Face) => state[face].map((color) => solved[mapping.get(color)!][4]);
  return {
    U: convert('U'),
    R: convert('R'),
    F: convert('F'),
    D: convert('D'),
    L: convert('L'),
    B: convert('B'),
  };
}
