import { coordinatesToFacelet, dot, faceletToCoordinates, rotateClockwise } from './coordinates';
import { FACES } from './faces';
import type { Move } from './moves';
import type { CubeState } from './types';

/** Apply one 3×3 face turn without modifying the input state. */
export function applyMove(state: CubeState, move: Move): CubeState {
  const next = {
    U: [...state.U],
    R: [...state.R],
    F: [...state.F],
    D: [...state.D],
    L: [...state.L],
    B: [...state.B],
  };
  const axis = faceletToCoordinates({ face: move.face, row: 1, column: 1 }).normal;
  const repetitions = move.turns === -1 ? 3 : move.turns;
  for (const face of FACES)
    for (let row = 0; row < 3; row++)
      for (let column = 0; column < 3; column++) {
        let { position, normal } = faceletToCoordinates({ face, row, column });
        if (dot(position, axis) === 1) {
          for (let i = 0; i < repetitions; i++) {
            position = rotateClockwise(position, axis);
            normal = rotateClockwise(normal, axis);
          }
          const destination = coordinatesToFacelet({ position, normal });
          next[destination.face][destination.row * 3 + destination.column] =
            state[face][row * 3 + column];
        }
      }
  return next;
}
