import { FACES, type Face } from '../../domain/cube/faces';
import type { Color } from '../../domain/cube/colors';
import type { FaceletAddress } from '../../domain/cube/coordinates';
import type { CubeState } from '../../domain/cube/types';
import { toNxNCoordinates } from '../../domain/nxn/cube';
import { check4Entry } from '../../domain/nxn/validate4';

/** Layout must be supplied by the pinned solver adapter; indices are solver-specific. */
export type FourSolverLayout = Readonly<{
  faces: readonly Face[];
  facelets: readonly FaceletAddress[];
  corners: readonly (readonly number[])[];
  wings: readonly (readonly number[])[];
  centers: readonly number[];
}>;
export type FourPieceState = Readonly<{
  cornerPermutation: readonly number[];
  cornerOrientation: readonly number[];
  wingPermutation: readonly number[];
  centreColour: readonly number[];
}>;

const identity: Record<Exclude<Color, 'unassigned'>, Face> = {
  white: 'U',
  yellow: 'D',
  red: 'R',
  orange: 'L',
  green: 'F',
  blue: 'B',
};

export function convertFourState(cube: CubeState, layout: FourSolverLayout): FourPieceState {
  if (check4Entry(cube).status !== 'counts-ok')
    throw new Error('4x4 entry failed preliminary checks.');
  if (
    layout.faces.length !== 6 ||
    new Set(layout.faces).size !== 6 ||
    FACES.some((face) => !layout.faces.includes(face)) ||
    layout.facelets.length !== 96 ||
    layout.corners.length !== 8 ||
    layout.wings.length !== 24 ||
    layout.centers.length !== 24 ||
    layout.corners.some((slot) => slot.length !== 3) ||
    layout.wings.some((slot) => slot.length !== 2)
  )
    throw new Error('Invalid solver layout.');
  const addresses = layout.facelets.map((address) => {
    toNxNCoordinates(address, 4);
    return `${address.face}:${address.row}:${address.column}`;
  });
  const indices = [...layout.corners.flat(), ...layout.wings.flat(), ...layout.centers];
  if (
    new Set(addresses).size !== 96 ||
    indices.length !== 96 ||
    new Set(indices).size !== 96 ||
    indices.some((index) => !Number.isInteger(index) || index < 0 || index >= 96)
  )
    throw new Error('Invalid solver layout.');
  const colors = layout.facelets.map(({ face, row, column }) => {
    const color = cube[face][row * 4 + column];
    if (color === 'unassigned' || !identity[color]) throw new Error('Invalid sticker color.');
    return layout.faces.indexOf(identity[color]);
  });
  const home = (index: number) => layout.faces.indexOf(layout.facelets[index].face);
  const cornerPermutation: number[] = [],
    cornerOrientation: number[] = [],
    wingPermutation: number[] = [];
  for (const slot of layout.corners) {
    const matches: { piece: number; twist: number }[] = [];
    layout.corners.forEach((piece, pieceIndex) => {
      for (let twist = 0; twist < 3; twist++)
        if (piece.every((id, i) => home(id) === colors[slot[(i + twist) % 3]]))
          matches.push({ piece: pieceIndex, twist });
    });
    if (matches.length !== 1) throw new Error('Invalid corner conversion.');
    cornerPermutation.push(matches[0].piece);
    cornerOrientation.push(matches[0].twist);
  }
  for (const slot of layout.wings) {
    const matches = layout.wings
      .map((piece, i) => (piece.every((id, j) => home(id) === colors[slot[j]]) ? i : -1))
      .filter((i) => i >= 0);
    if (matches.length !== 1) throw new Error('Invalid wing conversion.');
    wingPermutation.push(matches[0]);
  }
  if (new Set(cornerPermutation).size !== 8 || new Set(wingPermutation).size !== 24)
    throw new Error('Duplicate solver pieces.');
  return {
    cornerPermutation,
    cornerOrientation,
    wingPermutation,
    centreColour: layout.centers.map((index) => colors[index]),
  };
}
