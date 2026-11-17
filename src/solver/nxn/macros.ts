import { FACES, type Face } from '../../domain/cube/faces';
import type { LayerMove } from '../../domain/nxn/cube';
import { NxNEngine } from '../../domain/nxn/engine';
import { NxNStructure } from '../../domain/nxn/orbits';

/** A move sequence whose entire effect is a 3-cycle of centers or of whole wings. */
export type BaseMacro = {
  moves: LayerMove[];
  /** Destination of each moved sticker: the sticker at `from[i]` moves to `to[i]`. */
  from: number[];
  to: number[];
};

export type BaseMacros = {
  /** Keyed by center orbit index. */
  centers: Map<number, BaseMacro>;
  /** Keyed by wing piece orbit index. */
  wings: Map<number, BaseMacro>;
};

const layerMove = (face: Face, layer: number, turns: 1 | -1 | 2): LayerMove => ({
  face,
  layer,
  width: 1,
  turns,
});

export const inverseMove = (m: LayerMove): LayerMove => ({
  ...m,
  turns: m.turns === 2 ? 2 : m.turns === 1 ? -1 : 1,
});

export const invertMoves = (moves: readonly LayerMove[]): LayerMove[] =>
  [...moves].reverse().map(inverseMove);

const cache = new Map<number, BaseMacros>();

/**
 * Find one pure macro per orbit by searching the commutators `[U, S·Q·S']`, where U is an
 * outer quarter turn and S, Q are single layer quarter turns. A candidate is accepted only
 * if its complete sticker permutation is exactly one 3-cycle of centers, or exactly three
 * whole wings, inside a single orbit.
 */
export function findBaseMacros(size: number): BaseMacros {
  const hit = cache.get(size);
  if (hit) return hit;
  const engine = NxNEngine.for(size);
  const structure = NxNStructure.for(size);
  const total = engine.total;
  const layers: LayerMove[] = [];
  for (const face of ['U', 'R', 'F'] as const)
    for (let layer = 1; layer < size - 1; layer++)
      for (const turns of [1, -1] as const) layers.push(layerMove(face, layer, turns));
  for (const face of FACES)
    for (const turns of [1, -1] as const) layers.push(layerMove(face, 0, turns));
  const forward = layers.map((m) => engine.perm(m.face, m.layer, m.turns));
  const backward = forward.map((perm) => {
    const inverse = new Int32Array(total);
    for (let i = 0; i < total; i++) inverse[perm[i]] = i;
    return inverse;
  });
  const support = forward.map((perm) => {
    const list: number[] = [];
    for (let i = 0; i < total; i++) if (perm[i] !== i) list.push(i);
    return list;
  });
  const stamp = new Uint32Array(total);
  let stampId = 0;
  const result: BaseMacros = { centers: new Map(), wings: new Map() };
  const wantedCenters = structure.centerOrbits.length;
  const wantedWings = structure.wingPieceOrbits.length;
  const uTurns = [1, -1] as const;
  for (const uTurn of uTurns) {
    const pU = engine.perm('U', 0, uTurn);
    const pUi = new Int32Array(total);
    for (let i = 0; i < total; i++) pUi[pU[i]] = i;
    const supU: number[] = [];
    for (let i = 0; i < total; i++) if (pU[i] !== i) supU.push(i);
    for (let si = 0; si < layers.length; si++) {
      const S = layers[si];
      const pS = forward[si];
      const pSi = backward[si];
      for (let qi = 0; qi < layers.length; qi++) {
        const Q = layers[qi];
        if (Q.face === S.face && Q.layer === S.layer) continue;
        const pQ = forward[qi];
        const pQi = backward[qi];
        stampId++;
        const candidates: number[] = [];
        const add = (i: number) => {
          if (stamp[i] !== stampId) {
            stamp[i] = stampId;
            candidates.push(i);
          }
        };
        supU.forEach(add);
        support[si].forEach(add);
        for (const i of support[qi]) add(pSi[i]);
        const from: number[] = [];
        const to: number[] = [];
        let tooMany = false;
        for (const i of candidates) {
          // U, then S·Q·S', then U', then (S·Q·S')⁻¹ = S·Q'·S'.
          let x = pU[i];
          x = pSi[pQ[pS[x]]];
          x = pUi[x];
          x = pSi[pQi[pS[x]]];
          if (x !== i) {
            from.push(i);
            to.push(x);
            if (from.length > 6) {
              tooMany = true;
              break;
            }
          }
        }
        if (tooMany || (from.length !== 3 && from.length !== 6)) continue;
        const kinds = from.map((i) => structure.kind[i]);
        if (kinds.some((k) => k === 'corner')) continue;
        const moves: LayerMove[] = [
          layerMove('U', 0, uTurn),
          S,
          Q,
          inverseMove(S),
          inverseMove(layerMove('U', 0, uTurn)),
          S,
          inverseMove(Q),
          inverseMove(S),
        ];
        if (from.length === 3 && kinds.every((k) => k === 'center')) {
          const orbit = structure.orbitOf[from[0]];
          if (from.every((i) => structure.orbitOf[i] === orbit) && !result.centers.has(orbit))
            result.centers.set(orbit, { moves, from, to });
        } else if (from.length === 6 && kinds.every((k) => k === 'wing')) {
          const orbit = structure.wingPieceOrbitOf[from[0]];
          const pieces = new Set(from.map((i) => Math.min(i, structure.pieceMates[i][0])));
          if (
            pieces.size === 3 &&
            from.every((i) => structure.wingPieceOrbitOf[i] === orbit) &&
            !result.wings.has(orbit)
          )
            result.wings.set(orbit, { moves, from, to });
        }
        if (result.wings.size === wantedWings && result.centers.size >= wantedCenters - 1) {
          // The fixed centers of odd cubes form an orbit that never needs a macro.
          cache.set(size, result);
          return result;
        }
      }
    }
  }
  cache.set(size, result);
  return result;
}
