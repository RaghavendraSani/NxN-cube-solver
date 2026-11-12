import { cubeFromFaces, faceOf, parseFaceletString, solve, turnsOf } from '@turnwise/cube-solver';
import { applyMove } from '../domain/cube/applyMove';
import { FACES } from '../domain/cube/faces';
import { isSolved } from '../domain/cube/isSolved';
import type { Move } from '../domain/cube/moves';
import { centerMapping } from '../domain/cube/centerMapping';
import type { CubeState } from '../domain/cube/types';
import { validateCube } from '../domain/validation/validateCube';

/** Map the entered colors to the solver's face-letter representation. */
export function toFaceletString(state: CubeState): string {
  const mapping = centerMapping(state);
  if (!mapping) throw new Error('Invalid centers.');
  return FACES.flatMap((face) =>
    state[face].map((color) => {
      const identity = mapping.get(color);
      if (!identity) throw new Error('Unassigned or unknown color.');
      return identity;
    }),
  ).join('');
}

/** Replay a proposed solution against the domain state. */
export function verifySolution(state: CubeState, moves: readonly Move[]): boolean {
  return isSolved(moves.reduce((current, move) => applyMove(current, move), state));
}

/** Solve a valid 3×3 and return moves only after replay verification. */
export function solveCube(state: CubeState): Move[] {
  if (!validateCube(state).valid) throw new Error('Invalid cube state.');
  if (isSolved(state)) return [];
  const input = cubeFromFaces(parseFaceletString(toFaceletString(state)));
  const moves: Move[] = solve(input).map((move) => {
    const turns = turnsOf(move);
    return { face: faceOf(move), turns: turns === 3 ? -1 : turns };
  });
  if (!verifySolution(state, moves)) throw new Error('Solver result failed verification.');
  return moves;
}
