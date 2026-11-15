import type { CubeState } from '../../domain/cube/types';
import { applyNxNMove, isNxNSolved, type LayerMove } from '../../domain/nxn/cube';
import { check5Entry } from '../../domain/fiveByFive/validate';
import { findFiveCenterMoves } from './centers';
import { findFiveEdgePairing } from './edges';
import { solveReducedFive } from './reducedSolver';

/** Run the bounded reduction stages and independently replay the complete result. */
export function solveFive(state: CubeState): LayerMove[] {
  if (check5Entry(state).status !== 'checks-ok') throw new Error('Invalid 5x5 entry.');
  const centers = findFiveCenterMoves(state, 8);
  if (!centers) throw new Error('Center reduction search exhausted.');
  const centered = centers.reduce((cube, move) => applyNxNMove(cube, 5, move), state);
  const edges = findFiveEdgePairing(centered, 4);
  if (!edges) throw new Error('Edge pairing search exhausted.');
  const reduced = edges.reduce((cube, move) => applyNxNMove(cube, 5, move), centered);
  const moves = [...centers, ...edges, ...solveReducedFive(reduced)];
  const replayed = moves.reduce((cube, move) => applyNxNMove(cube, 5, move), state);
  if (!isNxNSolved(replayed, 5)) throw new Error('5x5 solution failed verification.');
  return moves;
}
