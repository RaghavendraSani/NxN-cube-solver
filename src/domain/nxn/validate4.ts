import { FACES } from '../cube/faces';
import { countColors, PALETTE_COLORS } from '../cube/inputState';
import type { CubeState } from '../cube/types';
import { createNxNCube, toNxNCoordinates } from './cube';
import { FACE_BASIS, dot, type FaceletAddress, type Vector } from '../cube/coordinates';
import type { Face } from '../cube/faces';

// Each corner starts with U/D and follows a consistent handed ordering.
const cornerSlots: readonly (readonly (readonly [Face, number])[])[] = [
  [
    ['U', 15],
    ['R', 0],
    ['F', 3],
  ],
  [
    ['U', 12],
    ['F', 0],
    ['L', 3],
  ],
  [
    ['U', 0],
    ['L', 0],
    ['B', 3],
  ],
  [
    ['U', 3],
    ['B', 0],
    ['R', 3],
  ],
  [
    ['D', 3],
    ['F', 15],
    ['R', 12],
  ],
  [
    ['D', 0],
    ['L', 15],
    ['F', 12],
  ],
  [
    ['D', 12],
    ['B', 15],
    ['L', 12],
  ],
  [
    ['D', 15],
    ['R', 15],
    ['B', 12],
  ],
];

// Surface stickers with the same cubie position belong to the same visible piece.
const groups = new Map<string, FaceletAddress[]>();
for (const face of FACES)
  for (let row = 0; row < 4; row++)
    for (let column = 0; column < 4; column++) {
      const address = { face, row, column };
      const key = toNxNCoordinates(address, 4).position.join(',');
      groups.set(key, [...(groups.get(key) ?? []), address]);
    }
const corners = [...groups.values()].filter((group) => group.length === 3);
const wings = [...groups.values()].filter((group) => group.length === 2);
const signature = (state: CubeState, group: FaceletAddress[]) =>
  group
    .map(({ face, row, column }) => state[face][row * 4 + column])
    .sort()
    .join(',');
const solved = createNxNCube(4, true);
function signatures(state: CubeState, pieces: FaceletAddress[][]): string[] {
  return pieces.map((piece) => signature(state, piece)).sort();
}
const solvedCorners = signatures(solved, corners);
const solvedWings = signatures(solved, wings);

// A wing's two colors and handedness identify one of the 24 distinct wings.
// Sorting by color makes the sign independent of the slot's face ordering;
// the scalar triple product is preserved by every proper cube rotation.
function wingIdentity(state: CubeState, wing: FaceletAddress[]): string {
  const stickers = wing
    .map((address) => ({
      color: state[address.face][address.row * 4 + address.column],
      normal: FACE_BASIS[address.face][0],
    }))
    .sort((a, b) => a.color.localeCompare(b.color));
  const [a, b] = stickers.map((sticker) => sticker.normal);
  const cross: Vector = [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const position = toNxNCoordinates(wing[0], 4).position;
  return `${stickers[0].color},${stickers[1].color},${Math.sign(dot(cross, position))}`;
}
const solvedWingIdentities = wings.map((wing) => wingIdentity(solved, wing)).sort();

/** Preliminary checks only: counts cannot prove a state is physically solvable. */
export function check4Entry(state: CubeState): {
  status:
    | 'incomplete'
    | 'color-count'
    | 'corner-piece'
    | 'corner-orientation'
    | 'wing-piece'
    | 'counts-ok';
} {
  if (
    FACES.some(
      (face) => state[face].length !== 16 || state[face].some((color) => color === 'unassigned'),
    )
  )
    return { status: 'incomplete' };
  const counts = countColors(state);
  if (PALETTE_COLORS.some((color) => counts[color] !== 16)) return { status: 'color-count' };
  if (signatures(state, corners).some((value, i) => value !== solvedCorners[i]))
    return { status: 'corner-piece' };
  let cornerTwist = 0;
  const seenCorners = new Set<number>();
  for (const slot of cornerSlots) {
    const colors = slot.map(([face, index]) => state[face][index]);
    const twist = colors.findIndex((color) => color === 'white' || color === 'yellow');
    const piece = cornerSlots.findIndex((reference) =>
      reference.every(([face], i) => colors[(twist + i) % 3] === solved[face][0]),
    );
    if (twist < 0 || piece < 0 || seenCorners.has(piece)) return { status: 'corner-piece' };
    seenCorners.add(piece);
    cornerTwist += twist;
  }
  if (cornerTwist % 3 !== 0) return { status: 'corner-orientation' };
  if (signatures(state, wings).some((value, i) => value !== solvedWings[i]))
    return { status: 'wing-piece' };
  if (
    wings
      .map((wing) => wingIdentity(state, wing))
      .sort()
      .some((value, i) => value !== solvedWingIdentities[i])
  )
    return { status: 'wing-piece' };
  return { status: 'counts-ok' };
}
