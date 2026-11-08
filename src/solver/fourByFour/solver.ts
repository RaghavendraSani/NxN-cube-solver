import { FACES } from '../../domain/cube/faces';
import type { CubeState } from '../../domain/cube/types';
import { applyNxNMove, fromNxNCoordinates, type LayerMove } from '../../domain/nxn/cube';
import { check4Entry } from '../../domain/nxn/validate4';
import { FACES as solverFaces } from '../../../vendor/cubesmith/src/notation/move';
import { pieces444 } from '../../../vendor/cubesmith/src/puzzles/444/pieces';
import { move444Tables } from '../../../vendor/cubesmith/src/puzzles/444/state';
import { solve444 } from '../../../vendor/cubesmith/src/puzzles/444/solve';
import { convertFourState, type FourSolverLayout } from './convert';

function isFourSolved(state: CubeState): boolean {
  const colors = FACES.map((face) => state[face][0]);
  return (
    new Set(colors).size === 6 &&
    !colors.includes('unassigned') &&
    FACES.every(
      (face) => state[face].length === 16 && state[face].every((color) => color === state[face][0]),
    )
  );
}

export function verifyFourSolution(state: CubeState, moves: readonly LayerMove[]): boolean {
  try {
    return isFourSolved(moves.reduce((current, move) => applyNxNMove(current, 4, move), state));
  } catch {
    return false;
  }
}

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
  if (isFourSolved(state)) return [];
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
