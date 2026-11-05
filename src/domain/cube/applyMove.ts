import { coordinatesToFacelet, dot, faceletToCoordinates, type Vector } from './coordinates';
import { FACES } from './faces';
import type { Move } from './moves';
import type { CubeState } from './types';

// A clockwise quarter-turn viewed along the outward normal is -90 degrees.
function rotateClockwise(v: Vector, axis: Vector): Vector {
  const [x, y, z] = v;
  const [a, b, c] = axis;
  const projection = dot(v, axis);
  return [
    a * projection - (b * z - c * y),
    b * projection - (c * x - a * z),
    c * projection - (a * y - b * x),
  ];
}

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
