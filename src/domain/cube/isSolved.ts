import { FACES } from './faces';
import type { CubeState } from './types';

/** Requires six distinct uniformly colored faces; physical validity is a separate concern. */
export function isSolved(state: CubeState): boolean {
  const centers = FACES.map((face) => state[face][4]);
  return (
    new Set(centers).size === 6 &&
    !centers.includes('unassigned') &&
    FACES.every(
      (face) => state[face].length === 9 && state[face].every((color) => color === state[face][4]),
    )
  );
}
