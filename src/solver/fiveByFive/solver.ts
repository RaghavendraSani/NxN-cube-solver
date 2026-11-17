import type { CubeState } from '../../domain/cube/types';
import type { LayerMove } from '../../domain/nxn/cube';
import { solveNxN } from '../nxn/solveNxN';

/**
 * Solve a 5×5×5 cube. The reduction method is shared with every size from 4×4 up (see
 * `../nxn`), so this file only names the size for readers looking for the 5×5 solver.
 * The result is replay-verified on the full cube before it is returned.
 */
export function solveFive(state: CubeState): LayerMove[] {
  return solveNxN(state, 5);
}
