import { FACES } from '../cube/faces';
import type { CubeState } from '../cube/types';
import { createNxNCube, type LayerMove } from './cube';
import { applyMovesFast } from './applyMoves';

/**
 * A reproducible scrambled cube of any supported size for demonstrations and tests. It is
 * produced by real layer turns, so it is always a legal, solvable cube in the standard
 * color scheme.
 */
export function createExampleCube(size: number): CubeState {
  let seed = 0x9e3779b9 ^ size;
  const next = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  const turns = [1, -1, 2] as const satisfies readonly LayerMove['turns'][];
  const moves: LayerMove[] = Array.from({ length: 12 + 4 * size }, () => ({
    face: FACES[Math.floor(next() * 6)],
    layer: Math.floor(next() * size),
    width: 1,
    turns: turns[Math.floor(next() * 3)],
  }));
  return applyMovesFast(createNxNCube(size, true), size, moves);
}
