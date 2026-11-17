import type { Color } from '../cube/colors';
import { FACES, type Face } from '../cube/faces';
import { COLOR_CODES, NxNEngine } from './engine';
import { NxNStructure } from './orbits';

export const OPPOSITE: Record<string, Color> = {
  white: 'yellow',
  yellow: 'white',
  green: 'blue',
  blue: 'green',
  red: 'orange',
  orange: 'red',
};

/** Face → color of the solved cube a state is being steered towards. */
export type Scheme = Record<Face, Color>;

export const STANDARD_SCHEME: Scheme = {
  U: 'white',
  R: 'red',
  F: 'green',
  D: 'yellow',
  L: 'orange',
  B: 'blue',
};

const sign = (permutation: readonly number[]): number => {
  const seen = new Array<boolean>(permutation.length).fill(false);
  let parity = 0;
  for (let i = 0; i < permutation.length; i++) {
    if (seen[i]) continue;
    let length = 0;
    for (let j = i; !seen[j]; j = permutation[j]) {
      seen[j] = true;
      length++;
    }
    parity += length - 1;
  }
  return parity & 1;
};

/** Stickers of the solved cube of a scheme, optionally after one outer R quarter turn. */
export function targetStickers(size: number, scheme: Scheme, turnedR: boolean): Uint8Array {
  const engine = NxNEngine.for(size);
  const out = new Uint8Array(engine.total);
  FACES.forEach((face, faceIndex) =>
    out.fill(
      COLOR_CODES.indexOf(scheme[face]),
      faceIndex * engine.faceSize,
      (faceIndex + 1) * engine.faceSize,
    ),
  );
  if (turnedR) NxNEngine.apply(out, engine.perm('R', 0, 1));
  return out;
}

/** Scheme implied by the fixed centers (odd cubes) or by the UFR corner (even cubes). */
export function deriveScheme(size: number, state: Uint8Array): Scheme | null {
  const engine = NxNEngine.for(size);
  const color = (face: Face, row: number, column: number) =>
    COLOR_CODES[state[engine.index(face, row, column)]];
  let scheme: Scheme;
  if (size % 2 === 1) {
    const mid = (size - 1) / 2;
    scheme = {
      U: color('U', mid, mid),
      R: color('R', mid, mid),
      F: color('F', mid, mid),
      D: color('D', mid, mid),
      L: color('L', mid, mid),
      B: color('B', mid, mid),
    };
  } else {
    const up = color('U', size - 1, size - 1);
    const front = color('F', 0, size - 1);
    const right = color('R', 0, 0);
    scheme = {
      U: up,
      F: front,
      R: right,
      D: OPPOSITE[up],
      B: OPPOSITE[front],
      L: OPPOSITE[right],
    };
  }
  const colors = Object.values(scheme);
  if (colors.includes('unassigned') || new Set(colors).size !== 6) return null;
  if (
    OPPOSITE[scheme.U] !== scheme.D ||
    OPPOSITE[scheme.F] !== scheme.B ||
    OPPOSITE[scheme.R] !== scheme.L
  )
    return null;
  return scheme;
}

/** Parity of the corner permutation measured against the solved cube of a scheme. */
export function cornerParity(size: number, state: Uint8Array, scheme: Scheme): number | null {
  const engine = NxNEngine.for(size);
  const structure = NxNStructure.for(size);
  const pieces = new Map<string, number[]>();
  for (let i = 0; i < engine.total; i++) {
    if (structure.kind[i] !== 'corner') continue;
    const key = engine.positionKey(i);
    pieces.set(key, [...(pieces.get(key) ?? []), i]);
  }
  const positions = [...pieces.values()];
  const home = new Map<string, number>();
  positions.forEach((stickers, k) =>
    home.set(
      stickers
        .map((s) => scheme[FACES[Math.floor(s / engine.faceSize)]])
        .sort()
        .join('|'),
      k,
    ),
  );
  const permutation: number[] = [];
  for (const stickers of positions) {
    const h = home.get(
      stickers
        .map((s) => COLOR_CODES[state[s]])
        .sort()
        .join('|'),
    );
    if (h === undefined) return null;
    permutation.push(h);
  }
  return new Set(permutation).size === 8 ? sign(permutation) : null;
}

export type WingParity = { permutation: number; flips: number };

/**
 * For every wing orbit: parity of the piece permutation relative to the target, and (for
 * orbits whose two stickers are interchangeable) parity of flipped pieces. Pure 3-cycles
 * never change either number. Returns null if some wing cannot occur on a real cube.
 */
export function wingParities(
  size: number,
  state: Uint8Array,
  target: Uint8Array,
): WingParity[] | null {
  const structure = NxNStructure.for(size);
  const out: WingParity[] = [];
  for (const orbit of structure.wingPieceOrbits) {
    const free = orbit.pieces.every(([a, b]) => structure.orbitOf[a] === structure.orbitOf[b]);
    // With distinct sticker classes a wing cannot flip, so colors are an ordered pair.
    const ordered = orbit.pieces.map(([a, b]) =>
      free || structure.orbitOf[a] < structure.orbitOf[b] ? [a, b] : [b, a],
    );
    const key = (x: number, y: number) =>
      free ? (x < y ? `${x}|${y}` : `${y}|${x}`) : `${x}|${y}`;
    const homes = new Map<string, number>();
    ordered.forEach(([a, b], index) => homes.set(key(target[a], target[b]), index));
    if (homes.size !== orbit.pieces.length) return null;
    const permutation: number[] = [];
    const local = new Map<number, number>();
    orbit.stickers.forEach((s, k) => local.set(s, k));
    const stickerPermutation = new Array<number>(orbit.stickers.length);
    for (const [a, b] of ordered) {
      const index = homes.get(key(state[a], state[b]));
      if (index === undefined) return null;
      permutation.push(index);
      const [ta, tb] = ordered[index];
      const straight = target[ta] === state[a];
      stickerPermutation[local.get(a)!] = local.get(straight ? ta : tb)!;
      stickerPermutation[local.get(b)!] = local.get(straight ? tb : ta)!;
    }
    if (new Set(permutation).size !== permutation.length) return null;
    out.push({ permutation: sign(permutation), flips: free ? sign(stickerPermutation) : 0 });
  }
  return out;
}
