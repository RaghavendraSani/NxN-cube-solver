import type { CubeState } from '../../domain/cube/types';
import {
  applyNxNMove,
  fromNxNCoordinates,
  isNxNSolved,
  type LayerMove,
} from '../../domain/nxn/cube';
import { check4Entry } from '../../domain/nxn/validate4';
import { FACES as solverFaces } from '../../../vendor/cubesmith/src/notation/move';
import { pieces444 } from '../../../vendor/cubesmith/src/puzzles/444/pieces';
import { move444Tables } from '../../../vendor/cubesmith/src/puzzles/444/state';
import { solve444 } from '../../../vendor/cubesmith/src/puzzles/444/solve';
import { convertFourState, type FourSolverLayout } from './convert';

/** Replay a 4×4 solution and reject malformed moves or an unsolved result. */
export function verifyFourSolution(state: CubeState, moves: readonly LayerMove[]): boolean {
  try {
    return isNxNSolved(
      moves.reduce((current, move) => applyNxNMove(current, 4, move), state),
      4,
    );
  } catch {
    return false;
  }
}

/** Translate the vendored solver's facelet positions to our cube coordinates. */
function solverLayout(): FourSolverLayout {
  const { facelets, cornerFacelets, wingFacelets, centreFacelets } = pieces444();
  return {
    faces: solverFaces,
    facelets: facelets.map(({ position, normal }) =>
      fromNxNCoordinates(
        {
          position: [position[0] - normal[0], position[1] - normal[1], position[2] - normal[2]],
          normal,
        },
        4,
      ),
    ),
    corners: cornerFacelets,
    wings: wingFacelets,
    centers: centreFacelets,
  };
}

/** Internal adapter only. Call from a worker; input validation is preliminary. */
export function solveFour(state: CubeState): LayerMove[] {
  if (check4Entry(state).status !== 'counts-ok') throw new Error('Invalid 4x4 entry.');
  if (isNxNSolved(state, 4)) return [];
  const pieceState = convertFourState(state, solverLayout());
  const tables = move444Tables();
  const moves: LayerMove[] = solve444(pieceState).map((index) => {
    const move = tables[index]?.move;
    if (!move || (move.depth !== 1 && move.depth !== 2)) throw new Error('Invalid solver move.');
    return {
      face: move.face,
      layer: 0,
      width: move.depth,
      turns: move.amount === 3 ? -1 : move.amount,
    };
  });
  if (!verifyFourSolution(state, moves)) throw new Error('4x4 solution failed independent replay.');
  return moves;
}
