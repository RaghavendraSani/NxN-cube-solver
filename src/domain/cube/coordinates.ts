import type { Face } from './faces';

export type Vector = readonly [number, number, number];
export type FaceletAddress = Readonly<{ face: Face; row: number; column: number }>;
export type FaceletCoordinates = Readonly<{ position: Vector; normal: Vector }>;

// x points right, y up, z front. Each basis gives outward normal, screen-right, screen-down.
export const FACE_BASIS: Record<Face, readonly [Vector, Vector, Vector]> = {
  U: [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
  ],
  R: [
    [1, 0, 0],
    [0, 0, -1],
    [0, -1, 0],
  ],
  F: [
    [0, 0, 1],
    [1, 0, 0],
    [0, -1, 0],
  ],
  D: [
    [0, -1, 0],
    [1, 0, 0],
    [0, 0, -1],
  ],
  L: [
    [-1, 0, 0],
    [0, 0, 1],
    [0, -1, 0],
  ],
  B: [
    [0, 0, -1],
    [-1, 0, 0],
    [0, -1, 0],
  ],
};

export function dot(a: Vector, b: Vector): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

export function faceletToCoordinates({ face, row, column }: FaceletAddress): FaceletCoordinates {
  if (
    !Number.isInteger(row) ||
    row < 0 ||
    row > 2 ||
    !Number.isInteger(column) ||
    column < 0 ||
    column > 2
  ) {
    throw new RangeError('Facelet row and column must be integers from 0 to 2.');
  }
  const [normal, right, down] = FACE_BASIS[face];
  return {
    normal,
    position: [0, 1, 2].map(
      (i) => normal[i] + (column - 1) * right[i] + (row - 1) * down[i],
    ) as unknown as Vector,
  };
}

export function coordinatesToFacelet({ position, normal }: FaceletCoordinates): FaceletAddress {
  const face = (Object.keys(FACE_BASIS) as Face[]).find(
    (candidate) => dot(FACE_BASIS[candidate][0], normal) === 1,
  );
  if (!face) throw new RangeError('Invalid facelet normal.');
  const [, right, down] = FACE_BASIS[face];
  const row = dot(position, down) + 1;
  const column = dot(position, right) + 1;
  if (
    dot(position, FACE_BASIS[face][0]) !== 1 ||
    !Number.isInteger(row) ||
    row < 0 ||
    row > 2 ||
    !Number.isInteger(column) ||
    column < 0 ||
    column > 2
  ) {
    throw new RangeError('Invalid facelet position.');
  }
  return { face, row, column };
}
