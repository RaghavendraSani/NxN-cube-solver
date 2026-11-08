import {
  dot,
  FACE_BASIS,
  type FaceletAddress,
  type FaceletCoordinates,
  type Vector,
} from '../cube/coordinates';
import { FACES, type Face } from '../cube/faces';
import type { Color } from '../cube/colors';
import type { CubeState } from '../cube/types';

export type LayerMove = Readonly<{ face: Face; layer: number; width: number; turns: 1 | -1 | 2 }>;

export function isNxNSolved(state: CubeState, size: number): boolean {
  checkSize(size);
  const colors = FACES.map((face) => state[face][0]);
  return (
    new Set(colors).size === 6 &&
    !colors.includes('unassigned') &&
    FACES.every(
      (face) =>
        state[face].length === size * size &&
        state[face].every((color) => color === state[face][0]),
    )
  );
}

function checkSize(size: number) {
  if (!Number.isInteger(size) || size < 3 || size > 20)
    throw new RangeError('Cube size must be an integer from 3 to 20.');
}

export function createNxNCube(size: number, solved = false): CubeState {
  checkSize(size);
  const colors: Record<Face, Color> = {
    U: 'white',
    R: 'red',
    F: 'green',
    D: 'yellow',
    L: 'orange',
    B: 'blue',
  };
  return Object.fromEntries(
    FACES.map((face) => [
      face,
      Array<Color>(size * size).fill(solved ? colors[face] : 'unassigned'),
    ]),
  ) as unknown as CubeState;
}

// Doubled coordinates avoid fractions for even sizes: the surface lies at ±(size - 1).
export function toNxNCoordinates(
  { face, row, column }: FaceletAddress,
  size: number,
): FaceletCoordinates {
  checkSize(size);
  if (
    !Number.isInteger(row) ||
    row < 0 ||
    row >= size ||
    !Number.isInteger(column) ||
    column < 0 ||
    column >= size
  )
    throw new RangeError('Invalid facelet address.');
  const [normal, right, down] = FACE_BASIS[face];
  const edge = size - 1;
  const position = [0, 1, 2].map(
    (i) => edge * normal[i] + (2 * column - edge) * right[i] + (2 * row - edge) * down[i],
  ) as unknown as Vector;
  return { position, normal };
}

export function fromNxNCoordinates(
  { position, normal }: FaceletCoordinates,
  size: number,
): FaceletAddress {
  checkSize(size);
  const face = FACES.find((candidate) =>
    FACE_BASIS[candidate][0].every((value, i) => value === normal[i]),
  );
  if (!face) throw new RangeError('Invalid facelet normal.');
  const [outward, right, down] = FACE_BASIS[face];
  const edge = size - 1;
  const row = (dot(position, down) + edge) / 2;
  const column = (dot(position, right) + edge) / 2;
  if (
    dot(position, outward) !== edge ||
    !Number.isInteger(row) ||
    row < 0 ||
    row >= size ||
    !Number.isInteger(column) ||
    column < 0 ||
    column >= size
  )
    throw new RangeError('Invalid facelet position.');
  return { face, row, column };
}

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

export function applyNxNMove(state: CubeState, size: number, move: LayerMove): CubeState {
  checkSize(size);
  if (
    !Number.isInteger(move.layer) ||
    !Number.isInteger(move.width) ||
    move.layer < 0 ||
    move.width < 1 ||
    move.layer + move.width > size ||
    ![1, -1, 2].includes(move.turns)
  )
    throw new RangeError('Invalid layer move.');
  if (FACES.some((face) => state[face].length !== size * size))
    throw new RangeError('Invalid cube dimensions.');
  const result = Object.fromEntries(FACES.map((face) => [face, [...state[face]]])) as Record<
    Face,
    Color[]
  >;
  const axis = FACE_BASIS[move.face][0];
  const edge = size - 1;
  for (const face of FACES)
    for (let row = 0; row < size; row++)
      for (let column = 0; column < size; column++) {
        let { position, normal } = toNxNCoordinates({ face, row, column }, size);
        const layer = (edge - dot(position, axis)) / 2;
        if (layer >= move.layer && layer < move.layer + move.width) {
          for (let i = 0; i < (move.turns === -1 ? 3 : move.turns); i++) {
            position = rotateClockwise(position, axis);
            normal = rotateClockwise(normal, axis);
          }
          const target = fromNxNCoordinates({ position, normal }, size);
          result[target.face][target.row * size + target.column] = state[face][row * size + column];
        }
      }
  return result;
}
