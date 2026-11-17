import { FACE_BASIS } from '../cube/coordinates';
import type { CubeState } from '../cube/types';
import { FACES, type Face } from '../cube/faces';
import { COLOR_CODES, NxNEngine } from './engine';
import { cornerParity, deriveScheme, targetStickers, wingParities } from './invariants';
import { NxNStructure } from './orbits';

export type NxNEntryStatus =
  | 'incomplete'
  | 'color-count'
  | 'center-count'
  | 'center-scheme'
  | 'corner-piece'
  | 'corner-orientation'
  | 'wing-piece'
  | 'edge-orientation'
  | 'parity'
  | 'counts-ok';

/**
 * Check that a fully entered N×N×N cube (N ≥ 4) could exist on a real cube.
 *
 * The checks are the complete set of invariants of the cube group: every color appears
 * N² times; each center orbit holds four stickers of every color; the center scheme is
 * valid; corners and wings are real, distinct pieces; corner twists sum to zero modulo
 * three; middle edges are not flipped in odd total; and on odd cubes the middle edges
 * and corners share one permutation parity. Wing parities of other orbits are free because
 * slice turns reach every combination. `counts-ok` therefore
 * means the cube is reachable, which the solver tests confirm by solving every such state.
 */
export function checkNxNEntry(state: CubeState, size: number): NxNEntryStatus {
  const engine = NxNEngine.for(size);
  const structure = NxNStructure.for(size);
  if (FACES.some((face) => state[face].length !== size * size))
    throw new RangeError('Invalid size.');
  const stickers = engine.fromState(state);
  const unassigned = COLOR_CODES.indexOf('unassigned');
  if (stickers.includes(unassigned)) return 'incomplete';
  const counts = new Array<number>(COLOR_CODES.length).fill(0);
  stickers.forEach((code) => counts[code]++);
  if (counts.slice(0, 6).some((count) => count !== size * size)) return 'color-count';
  for (const orbit of structure.centerOrbits) {
    if (orbit.length !== 24) continue;
    const perColor = new Array<number>(COLOR_CODES.length).fill(0);
    orbit.forEach((s) => perColor[stickers[s]]++);
    if (perColor.slice(0, 6).some((count) => count !== 4)) return 'center-count';
  }
  const scheme = deriveScheme(size, stickers);
  if (!scheme) return size % 2 === 1 ? 'center-scheme' : 'corner-piece';
  if (size % 2 === 1) {
    // The sticker at the middle of each face must agree with all other fixed centers.
    for (const orbit of structure.centerOrbits)
      if (
        orbit.length === 6 &&
        orbit.some((s) => stickers[s] !== COLOR_CODES.indexOf(scheme[structure.faceOf(s)]))
      )
        return 'center-scheme';
  }
  if (cornerParity(size, stickers, scheme) === null) return 'corner-piece';
  if (!cornersLegal(size, stickers, scheme)) return 'corner-orientation';
  const corners = cornerParity(size, stickers, scheme);
  const parities = wingParities(size, stickers, targetStickers(size, scheme, corners === 1));
  if (!parities) return 'wing-piece';
  if (parities.some((p) => p.flips !== 0)) return 'edge-orientation';
  // As on a 3×3, the middle edges of an odd cube must be permuted with the corners' parity.
  if (size % 2 === 1) {
    const middle = structure.wingPieceOrbits.findIndex((o) => o.offset === 0);
    if (parities[middle].permutation !== 0) return 'parity';
  }
  return 'counts-ok';
}

/** Corner handedness and twist sum, measured against the scheme. */
function cornersLegal(size: number, stickers: Uint8Array, scheme: Record<Face, string>): boolean {
  const engine = NxNEngine.for(size);
  const structure = NxNStructure.for(size);
  const positions = new Map<string, number[]>();
  for (let i = 0; i < engine.total; i++)
    if (structure.kind[i] === 'corner') {
      const key = engine.positionKey(i);
      positions.set(key, [...(positions.get(key) ?? []), i]);
    }
  const normalAxis = (s: number) => FACE_BASIS[structure.faceOf(s)][0].findIndex((v) => v !== 0);
  /** Stickers of a corner in counter-clockwise order seen from outside the cube. */
  const ordered = (list: number[]): number[] => {
    const byAxis = [...list].sort((a, b) => normalAxis(a) - normalAxis(b));
    const [x, y, z] = engine.coordinates(list[0]);
    return x * y * z > 0 ? byAxis : [byAxis[0], byAxis[2], byAxis[1]];
  };
  const upDown = (s: number) => structure.faceOf(s) === 'U' || structure.faceOf(s) === 'D';
  const homes = new Map<string, string[]>();
  for (const list of positions.values())
    homes.set(
      list
        .map((s) => scheme[structure.faceOf(s)])
        .sort()
        .join('|'),
      ordered(list).map((s) => scheme[structure.faceOf(s)]),
    );
  let twist = 0;
  for (const list of positions.values()) {
    const colors = ordered(list).map((s) => COLOR_CODES[stickers[s]] as string);
    const home = homes.get([...colors].sort().join('|'));
    if (!home) return false;
    const start = colors.indexOf(home[0]);
    if (home.some((color, k) => colors[(start + k) % 3] !== color)) return false;
    const reference = colors.indexOf(scheme.U) >= 0 ? scheme.U : scheme.D;
    const onUpDown = ordered(list).findIndex(upDown);
    twist += (colors.indexOf(reference) - onUpDown + 3) % 3;
  }
  return twist % 3 === 0;
}
