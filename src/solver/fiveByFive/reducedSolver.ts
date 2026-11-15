import type { CubeState } from '../../domain/cube/types';
import { applyNxNMove, isNxNSolved, type LayerMove } from '../../domain/nxn/cube';
import { reduce5To3 } from '../../domain/fiveByFive/reduce';
import { solveCube } from '../threeByThree/solver';

/** Solve an already reduced 5×5 and verify the moves on the full cube. */
export function solveReducedFive(state: CubeState): LayerMove[] {
  const moves = solveCube(reduce5To3(state)).map((move) => ({ ...move, layer: 0, width: 1 }));
  const result = moves.reduce((cube, move) => applyNxNMove(cube, 5, move), state);
  if (!isNxNSolved(result, 5)) throw new Error('Reduced 5x5 solution failed verification.');
  return moves;
}
