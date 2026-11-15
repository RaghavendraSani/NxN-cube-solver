import { centerMapping } from '../cube/centerMapping';
import { FACES, type Face } from '../cube/faces';
import { countColors, PALETTE_COLORS } from '../cube/inputState';
import type { Color } from '../cube/colors';
import { dot, FACE_BASIS, type FaceletAddress, type Vector } from '../cube/coordinates';
import type { CubeState } from '../cube/types';
import { validateCube } from '../threeByThree/validate';
import { createNxNCube, toNxNCoordinates } from '../nxn/cube';
import { pieces5 } from './pieces';

export type FiveEntryStatus =
  | 'incomplete'
  | 'color-count'
  | 'centers'
  | 'center-orbit'
  | 'corner-piece'
  | 'middle-edge-piece'
  | 'wing-piece'
  | 'corner-orientation'
  | 'edge-orientation'
  | 'parity'
  | 'checks-ok';

const pieces = pieces5();
const solved = createNxNCube(5, true);

/** Sort piece color combinations so their order on the cube does not matter. */
function signatures(state: CubeState, groups: readonly (readonly FaceletAddress[])[]): string[] {
  return groups
    .map((group) =>
      group
        .map(({ face, row, column }) => state[face][row * 5 + column])
        .sort()
        .join(','),
    )
    .sort();
}

/** Identify a wing by its colors and the handedness of its position. */
function wingIdentities(state: CubeState): string[] {
  return pieces.wings
    .map((wing) => {
      const stickers = wing
        .map((address) => ({
          color: state[address.face][address.row * 5 + address.column],
          normal: FACE_BASIS[address.face][0],
        }))
        .sort((a, b) => a.color.localeCompare(b.color));
      const [a, b] = stickers.map((sticker) => sticker.normal);
      // The scalar triple product preserves handedness under proper cube rotations.
      const cross: Vector = [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
      const position = toNxNCoordinates(wing[0], 5).position;
      return `${stickers[0].color},${stickers[1].color},${Math.sign(dot(cross, position))}`;
    })
    .sort();
}

/** Check necessary 5×5 entry conditions; success does not prove reachability. */
export function check5Entry(state: CubeState): { status: FiveEntryStatus } {
  if (FACES.some((face) => state[face].length !== 25 || state[face].includes('unassigned')))
    return { status: 'incomplete' };
  const counts = countColors(state);
  if (PALETTE_COLORS.some((color) => counts[color] !== 25)) return { status: 'color-count' };

  // centerMapping expects a 3×3 face; place each 5×5 fixed center at index four.
  const centers = Object.fromEntries(
    FACES.map((face) => [face, Array<Color>(9).fill(state[face][12])]),
  ) as Record<Face, Color[]>;
  if (!centerMapping(centers)) return { status: 'centers' };

  const checks = [
    [pieces.xCenters, 'center-orbit'],
    [pieces.tCenters, 'center-orbit'],
    [pieces.corners, 'corner-piece'],
    [pieces.middleEdges, 'middle-edge-piece'],
    [pieces.wings, 'wing-piece'],
  ] as const;
  for (const [groups, status] of checks) {
    const actual = signatures(state, groups);
    const expected = signatures(solved, groups);
    if (actual.some((value, index) => value !== expected[index])) return { status };
  }
  const expectedWings = wingIdentities(solved);
  if (wingIdentities(state).some((identity, index) => identity !== expectedWings[index]))
    return { status: 'wing-piece' };
  // Fixed centers, middle edges, and corners form a 3×3 under every 5×5 turn.
  const projection = Object.fromEntries(
    FACES.map((face) => [
      face,
      [0, 2, 4, 10, 12, 14, 20, 22, 24].map((index) => state[face][index]),
    ]),
  ) as Record<Face, Color[]>;
  const result = validateCube(projection);
  if (!result.valid) {
    if (result.reason === 'edge-piece') return { status: 'middle-edge-piece' };
    return { status: result.reason };
  }
  return { status: 'checks-ok' };
}
