import { FACES, type Face } from '../cube/faces';
import { FACE_BASIS } from '../cube/coordinates';
import { NxNEngine } from './engine';

export type StickerKind = 'center' | 'wing' | 'corner';

/**
 * Static structure of an N×N×N cube: which stickers are centers, wings or corners, which
 * stickers share a physical piece, and the "orbits" (sets of positions that moves can
 * exchange). Layer turns never mix orbits, so each orbit is an independent small puzzle.
 */
export class NxNStructure {
  readonly kind: StickerKind[];
  /** For wing and corner stickers, the other stickers of the same physical piece. */
  readonly pieceMates: number[][];
  /** Center orbits (sticker lists). */
  readonly centerOrbits: number[][] = [];
  /** Wing orbits keyed by their distance from the edge middle, ordered outermost first. */
  readonly wingOrbits: { stickers: number[]; offset: number }[] = [];
  readonly orbitOf: Int32Array;
  /** Wing piece orbit index per sticker (-1 for non-wings). */
  readonly wingPieceOrbitOf: Int32Array;
  /** Wing piece orbits: all stickers of every wing that moves among the same positions. */
  readonly wingPieceOrbits: { stickers: number[]; offset: number; pieces: number[][] }[] = [];

  private constructor(readonly engine: NxNEngine) {
    const { total, size } = engine;
    this.kind = new Array<StickerKind>(total);
    this.pieceMates = Array.from({ length: total }, () => []);
    for (let i = 0; i < total; i++) {
      const { row, column } = engine.describe(i);
      const rowEdge = row === 0 || row === size - 1;
      const columnEdge = column === 0 || column === size - 1;
      this.kind[i] = rowEdge && columnEdge ? 'corner' : rowEdge || columnEdge ? 'wing' : 'center';
    }
    // Stickers of one piece share a position: group by position key.
    const byPosition = new Map<string, number[]>();
    for (let i = 0; i < total; i++) {
      if (this.kind[i] === 'center') continue;
      const key = engine.positionKey(i);
      const group = byPosition.get(key);
      if (group) group.push(i);
      else byPosition.set(key, [i]);
    }
    for (const group of byPosition.values())
      for (const sticker of group) this.pieceMates[sticker] = group.filter((s) => s !== sticker);

    // Orbits: connected components under every layer quarter turn.
    const parent = Int32Array.from({ length: total }, (_, i) => i);
    const find = (x: number): number => {
      while (parent[x] !== x) x = parent[x] = parent[parent[x]];
      return x;
    };
    for (const face of FACES)
      for (let layer = 0; layer < size; layer++) {
        const perm = engine.perm(face, layer, 1);
        for (let i = 0; i < total; i++) if (perm[i] !== i) parent[find(i)] = find(perm[i]);
      }
    const groups = new Map<number, number[]>();
    for (let i = 0; i < total; i++) {
      if (this.kind[i] === 'corner') continue;
      const root = find(i);
      const g = groups.get(root);
      if (g) g.push(i);
      else groups.set(root, [i]);
    }
    this.orbitOf = new Int32Array(total).fill(-1);
    const wings: { stickers: number[]; offset: number }[] = [];
    for (const stickers of groups.values()) {
      if (this.kind[stickers[0]] === 'center') this.centerOrbits.push(stickers);
      else {
        const { row, column } = engine.describe(stickers[0]);
        const along = row === 0 || row === size - 1 ? column : row;
        wings.push({ stickers, offset: Math.abs(2 * along - (size - 1)) });
      }
    }
    wings.sort((a, b) => b.offset - a.offset || a.stickers[0] - b.stickers[0]);
    this.wingOrbits.push(...wings);
    // Merge sticker orbits that belong to the same physical wings.
    const unionParent = this.wingOrbits.map((_, k) => k);
    const root = (k: number): number =>
      unionParent[k] === k ? k : (unionParent[k] = root(unionParent[k]));
    this.wingOrbits.forEach((orbit, k) => {
      for (const s of orbit.stickers) {
        const mateOrbit = this.wingOrbits.findIndex((o) =>
          o.stickers.includes(this.pieceMates[s][0]),
        );
        if (mateOrbit >= 0) unionParent[root(mateOrbit)] = root(k);
      }
    });
    const merged = new Map<number, number[]>();
    this.wingOrbits.forEach((_, k) => merged.set(root(k), [...(merged.get(root(k)) ?? []), k]));
    for (const ks of merged.values()) {
      const stickers = ks.flatMap((k) => this.wingOrbits[k].stickers).sort((a, b) => a - b);
      const seen = new Set<number>();
      const pieces: number[][] = [];
      for (const s of stickers) {
        if (seen.has(s)) continue;
        const piece = [s, ...this.pieceMates[s]];
        piece.forEach((x) => seen.add(x));
        pieces.push(piece);
      }
      this.wingPieceOrbits.push({ stickers, offset: this.wingOrbits[ks[0]].offset, pieces });
    }
    this.wingPieceOrbits.sort((a, b) => b.offset - a.offset || a.stickers[0] - b.stickers[0]);
    this.wingPieceOrbitOf = new Int32Array(total).fill(-1);
    this.wingPieceOrbits.forEach((o, k) =>
      o.stickers.forEach((s) => (this.wingPieceOrbitOf[s] = k)),
    );
    this.centerOrbits.forEach((o, k) => o.forEach((s) => (this.orbitOf[s] = k)));
    this.wingOrbits.forEach((o, k) => o.stickers.forEach((s) => (this.orbitOf[s] = 1000 + k)));
  }

  /** For odd cubes: the middle-edge sticker on the same face and edge as each wing sticker. */
  referenceSticker(): Int32Array {
    const { engine } = this;
    const size = engine.size;
    if (size % 2 === 0) throw new Error('Only odd cubes have middle edges.');
    const map = new Int32Array(engine.total).fill(-1);
    const edge = size - 1;
    for (let i = 0; i < engine.total; i++) {
      if (this.kind[i] !== 'wing') continue;
      const p = engine.coordinates(i);
      const { face } = engine.describe(i);
      const normal = FACE_BASIS[face][0];
      // The coordinate along the edge is the one that is neither the normal axis nor extreme.
      const mid = p.map((c, axis) => (normal[axis] === 0 && Math.abs(c) !== edge ? 0 : c)) as [
        number,
        number,
        number,
      ];
      map[i] = engine.indexAt(mid[0], mid[1], mid[2], normal);
    }
    return map;
  }

  private static readonly cache = new Map<number, NxNStructure>();
  static for(size: number): NxNStructure {
    let s = NxNStructure.cache.get(size);
    if (!s) NxNStructure.cache.set(size, (s = new NxNStructure(NxNEngine.for(size))));
    return s;
  }

  faceOf(index: number): Face {
    return FACES[Math.floor(index / this.engine.faceSize)];
  }
}
