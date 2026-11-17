import { FACE_BASIS, faceletToCoordinates } from '../../domain/cube/coordinates';
import { FACES, type Face } from '../../domain/cube/faces';
import type { Color } from '../../domain/cube/colors';
import type { CubeState } from '../../domain/cube/types';
import type { LayerMove } from '../../domain/nxn/cube';
import { solveCube } from '../threeByThree/solver';
import { COLOR_CODES, NxNEngine } from '../../domain/nxn/engine';
import {
  cornerParity,
  deriveScheme,
  targetStickers,
  wingParities,
  type Scheme,
} from '../../domain/nxn/invariants';
import { NxNStructure } from '../../domain/nxn/orbits';
import { solveCenters, solveWings } from './reduction';

const OPPOSITE_FACE: Record<Face, Face> = { U: 'D', D: 'U', R: 'L', L: 'R', F: 'B', B: 'F' };

/** Canonical form of a layer turn: the (axis, depth from U/R/F, quarter turns mod 4). */
function canonical(move: LayerMove, size: number) {
  const base = (['U', 'R', 'F'] as const).includes(move.face as 'U' | 'R' | 'F');
  const axis = base ? move.face : OPPOSITE_FACE[move.face];
  const layer = base ? move.layer : size - 1 - move.layer;
  const quarter = (move.turns === -1 ? 3 : move.turns) * (base ? 1 : 3);
  return { axis: axis as 'U' | 'R' | 'F', layer, quarter: quarter % 4 };
}

/**
 * Merge neighbouring turns of the same layer (turns on one axis commute) and express each
 * move from the nearer side, so playback reads as "outer layer of the left face" rather
 * than "layer 19 of the right face". The result is replay-verified by the caller.
 */
export function simplifyMoves(moves: readonly LayerMove[], size: number): LayerMove[] {
  const stack: { axis: 'U' | 'R' | 'F'; layer: number; quarter: number }[] = [];
  for (const move of moves) {
    const next = canonical(move, size);
    let merged = false;
    for (let i = stack.length - 1; i >= 0 && stack[i].axis === next.axis; i--) {
      if (stack[i].layer === next.layer) {
        stack[i] = { ...stack[i], quarter: (stack[i].quarter + next.quarter) % 4 };
        if (stack[i].quarter === 0) stack.splice(i, 1);
        merged = true;
        break;
      }
    }
    if (!merged && next.quarter !== 0) stack.push(next);
  }
  return stack.map(({ axis, layer, quarter }) => {
    const nearOpposite = layer > (size - 1) / 2;
    const face: Face = nearOpposite ? OPPOSITE_FACE[axis] : axis;
    const depth = nearOpposite ? size - 1 - layer : layer;
    const turns = nearOpposite ? (4 - quarter) % 4 : quarter;
    return { face, layer: depth, width: 1, turns: turns === 3 ? -1 : (turns as 1 | 2) };
  });
}

/** Replay moves on a sticker array. */
export function replay(
  size: number,
  stickers: Uint8Array,
  moves: readonly LayerMove[],
): Uint8Array {
  const engine = NxNEngine.for(size);
  const out = stickers.slice();
  for (const move of moves) NxNEngine.apply(out, engine.permOf(move));
  return out;
}

export function stickersSolved(size: number, stickers: Uint8Array): boolean {
  const engine = NxNEngine.for(size);
  const seen = new Set<number>();
  for (let f = 0; f < 6; f++) {
    const first = stickers[f * engine.faceSize];
    if (first === COLOR_CODES.indexOf('unassigned') || seen.has(first)) return false;
    seen.add(first);
    for (let i = 1; i < engine.faceSize; i++)
      if (stickers[f * engine.faceSize + i] !== first) return false;
  }
  return true;
}

/** Fast independent replay check of a proposed solution. */
export function verifyNxNSolution(
  state: CubeState,
  size: number,
  moves: readonly LayerMove[],
): boolean {
  const engine = NxNEngine.for(size);
  return stickersSolved(size, replay(size, engine.fromState(state), moves));
}

/** Slice quarter turn (around U) whose wings belong to the given wing orbit. */
function kickFor(size: number, orbitIndex: number): LayerMove {
  const engine = NxNEngine.for(size);
  const structure = NxNStructure.for(size);
  const stickers = new Set(structure.wingPieceOrbits[orbitIndex].stickers);
  for (let layer = 1; layer < size - 1; layer++) {
    const perm = engine.perm('U', layer, 1);
    for (let i = 0; i < perm.length; i++)
      if (perm[i] !== i && stickers.has(i)) return { face: 'U', layer, width: 1, turns: 1 };
  }
  throw new Error('No slice for wing orbit.');
}

/** Read the reduced 3×3 out of a reduced N×N: corners, one wing per edge, one center. */
function projectReduced(size: number, stickers: Uint8Array): CubeState {
  const engine = NxNEngine.for(size);
  const reference = size % 2 === 1 ? 0 : 1;
  const edge = size - 1;
  const state: Record<string, Color[]> = {};
  for (const face of FACES) {
    const colors: Color[] = [];
    for (let row = 0; row < 3; row++)
      for (let column = 0; column < 3; column++) {
        const { position, normal } = faceletToCoordinates({ face, row, column });
        const big = position.map((c) => (c === 0 ? reference : c * edge)) as [
          number,
          number,
          number,
        ];
        const index = engine.indexAt(big[0], big[1], big[2], FACE_BASIS[face][0] ?? normal);
        if (index < 0) throw new Error('Internal error: projection failed.');
        colors.push(COLOR_CODES[stickers[index]]);
      }
    state[face] = colors;
  }
  return state as unknown as CubeState;
}

/**
 * Solve an N×N×N cube (4 ≤ N ≤ 20) by reduction: kick wing parities into shape, solve all
 * centers and wings with pure 3-cycles, then solve the resulting 3×3×3 with outer turns.
 * Every result is replayed on the full cube before it is returned.
 */
export function solveNxN(state: CubeState, size: number): LayerMove[] {
  if (!Number.isInteger(size) || size < 4 || size > 20) throw new RangeError('Unsupported size.');
  const engine = NxNEngine.for(size);
  const structure = NxNStructure.for(size);
  const original = engine.fromState(state);
  if (original.includes(COLOR_CODES.indexOf('unassigned'))) throw new Error('Incomplete cube.');
  if (stickersSolved(size, original)) return [];
  const stickers = original.slice();
  const moves: LayerMove[] = [];
  const odd = size % 2 === 1;
  const middle = structure.wingPieceOrbits.findIndex((o) => o.offset === 0);
  const reference = odd ? structure.referenceSticker() : null;
  let scheme: Scheme | null = null;
  let target: Uint8Array | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    scheme = deriveScheme(size, stickers);
    if (!scheme) throw new Error('Invalid center scheme.');
    const corners = cornerParity(size, stickers, scheme);
    if (corners === null) throw new Error('Invalid corners.');
    target = targetStickers(size, scheme, corners === 1);
    const base = wingParities(size, stickers, target);
    if (!base) throw new Error('Invalid wings.');
    const kicks: LayerMove[] = [];
    if (odd) {
      // The middle edges become the reduced 3×3's edges, so only their own parity matters.
      if (base[middle].flips !== 0) throw new Error('Impossible edge orientation.');
      // On a real cube the middle edges share the corners' parity (as on a 3×3).
      if (base[middle].permutation === 1) throw new Error('Impossible parity.');
      {
        for (let i = 0; i < stickers.length; i++)
          if (reference![i] >= 0 && structure.wingPieceOrbitOf[i] !== middle)
            target[i] = stickers[reference![i]];
        const parities = wingParities(size, stickers, target);
        if (!parities) throw new Error('Invalid wings.');
        parities.forEach((p, index) => {
          if (index !== middle && p.permutation === 1) kicks.push(kickFor(size, index));
        });
      }
    } else {
      if (base.some((p) => p.flips !== 0)) throw new Error('Impossible wing orientation.');
      base.forEach((p, index) => {
        if (p.permutation === 1) kicks.push(kickFor(size, index));
      });
    }
    if (kicks.length === 0) break;
    if (attempt === 5) throw new Error('Wing parity could not be corrected.');
    for (const kick of kicks) {
      moves.push(kick);
      NxNEngine.apply(stickers, engine.permOf(kick));
    }
  }
  if (!scheme || !target) throw new Error('Internal error.');
  solveCenters(size, stickers, scheme, moves);
  solveWings(size, stickers, target, moves, odd ? middle : -1);
  const reduced = projectReduced(size, stickers);
  for (const move of solveCube(reduced)) {
    const outer: LayerMove = { face: move.face, layer: 0, width: 1, turns: move.turns };
    moves.push(outer);
    NxNEngine.apply(stickers, engine.permOf(outer));
  }
  const result = simplifyMoves(moves, size);
  if (!stickersSolved(size, replay(size, original, result)))
    throw new Error('Verification failed.');
  return result;
}
