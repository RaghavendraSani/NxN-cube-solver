import type { CubeState } from '../cube/types';
import type { LayerMove } from './cube';
import { NxNEngine } from './engine';

/**
 * Apply many layer moves quickly using precomputed sticker permutations. Equivalent to
 * folding `applyNxNMove`, which is far slower on large cubes (tests cross-check the two).
 */
export function applyMovesFast(
  state: CubeState,
  size: number,
  moves: readonly LayerMove[],
): CubeState {
  const engine = NxNEngine.for(size);
  const stickers = engine.fromState(state);
  for (const move of moves) NxNEngine.apply(stickers, engine.permOf(move));
  return engine.toState(stickers);
}
