import { FACES, type Face } from '../cube/faces';
import { FACE_BASIS, rotateClockwise, type Vector } from '../cube/coordinates';
import type { Color } from '../cube/colors';
import type { CubeState } from '../cube/types';
import type { LayerMove } from './cube';

/**
 * Fast sticker-permutation engine for N×N×N cubes.
 *
 * A sticker index is `faceIndex * n² + row * n + column`, using the same face order and
 * row-major layout as `CubeState`. A move table `perm` sends the sticker at index `i` to
 * index `perm[i]`, which is exactly the semantics of `applyNxNMove`; tests cross-check them.
 */
export class NxNEngine {
  readonly faceSize: number;
  readonly total: number;
  /** Doubled coordinates of every sticker (the surface is at ±(n-1)). */
  private readonly px: Int16Array;
  private readonly py: Int16Array;
  private readonly pz: Int16Array;
  private readonly nx: Int8Array;
  private readonly ny: Int8Array;
  private readonly nz: Int8Array;
  private readonly lookup = new Map<number, number>();
  private readonly quarter = new Map<number, Int32Array>();

  private constructor(readonly size: number) {
    this.faceSize = size * size;
    this.total = 6 * this.faceSize;
    this.px = new Int16Array(this.total);
    this.py = new Int16Array(this.total);
    this.pz = new Int16Array(this.total);
    this.nx = new Int8Array(this.total);
    this.ny = new Int8Array(this.total);
    this.nz = new Int8Array(this.total);
    const edge = size - 1;
    FACES.forEach((face, faceIndex) => {
      const [normal, right, down] = FACE_BASIS[face];
      for (let row = 0; row < size; row++)
        for (let column = 0; column < size; column++) {
          const index = faceIndex * this.faceSize + row * size + column;
          const p = [0, 1, 2].map(
            (i) => edge * normal[i] + (2 * column - edge) * right[i] + (2 * row - edge) * down[i],
          );
          this.px[index] = p[0];
          this.py[index] = p[1];
          this.pz[index] = p[2];
          this.nx[index] = normal[0];
          this.ny[index] = normal[1];
          this.nz[index] = normal[2];
          this.lookup.set(this.key(p[0], p[1], p[2], normal), index);
        }
    });
  }

  private static readonly cache = new Map<number, NxNEngine>();
  static for(size: number): NxNEngine {
    let engine = NxNEngine.cache.get(size);
    if (!engine) NxNEngine.cache.set(size, (engine = new NxNEngine(size)));
    return engine;
  }

  private key(x: number, y: number, z: number, normal: Vector): number {
    const offset = this.size; // coordinates lie in [-(n-1), n-1]
    const side = 2 * this.size + 1;
    const axis = normal[0] !== 0 ? 0 : normal[1] !== 0 ? 1 : 2;
    const sign = normal[axis] > 0 ? 1 : 0;
    return (((x + offset) * side + (y + offset)) * side + (z + offset)) * 6 + axis * 2 + sign;
  }

  /** Position (ignoring which face the sticker looks at); stickers of one piece share it. */
  positionKey(index: number): string {
    return `${this.px[index]},${this.py[index]},${this.pz[index]}`;
  }

  /** Sticker at a doubled-coordinate position with the given outward normal, or -1. */
  indexAt(x: number, y: number, z: number, normal: Vector): number {
    return this.lookup.get(this.key(x, y, z, normal)) ?? -1;
  }

  coordinates(index: number): [number, number, number] {
    return [this.px[index], this.py[index], this.pz[index]];
  }

  index(face: Face, row: number, column: number): number {
    return FACES.indexOf(face) * this.faceSize + row * this.size + column;
  }

  describe(index: number): { face: Face; row: number; column: number } {
    const faceIndex = Math.floor(index / this.faceSize);
    const rest = index % this.faceSize;
    return { face: FACES[faceIndex], row: Math.floor(rest / this.size), column: rest % this.size };
  }

  /** Depth of a sticker below the given face (0 is the outermost layer). */
  depth(index: number, face: Face): number {
    const axis = FACE_BASIS[face][0];
    return (
      (this.size -
        1 -
        (this.px[index] * axis[0] + this.py[index] * axis[1] + this.pz[index] * axis[2])) /
      2
    );
  }

  /** Quarter-turn (clockwise) table for one layer, built lazily. */
  private quarterTable(face: Face, layer: number): Int32Array {
    const key = FACES.indexOf(face) * 64 + layer;
    let table = this.quarter.get(key);
    if (table) return table;
    table = new Int32Array(this.total);
    const axis = FACE_BASIS[face][0];
    for (let i = 0; i < this.total; i++) {
      if (this.depth(i, face) !== layer) {
        table[i] = i;
        continue;
      }
      const p = rotateClockwise([this.px[i], this.py[i], this.pz[i]], axis);
      const q = rotateClockwise([this.nx[i], this.ny[i], this.nz[i]], axis);
      const target = this.lookup.get(this.key(p[0], p[1], p[2], q));
      if (target === undefined) throw new Error('Internal error: unmapped sticker.');
      table[i] = target;
    }
    this.quarter.set(key, table);
    return table;
  }

  /** Permutation for `turns` quarter turns (1, -1 or 2) of layers [layer, layer+width). */
  perm(face: Face, layer: number, turns: 1 | -1 | 2, width = 1): Int32Array {
    const count = turns === -1 ? 3 : turns;
    const result = new Int32Array(this.total);
    for (let i = 0; i < this.total; i++) result[i] = i;
    for (let l = layer; l < layer + width; l++) {
      const table = this.quarterTable(face, l);
      for (let step = 0; step < count; step++)
        for (let i = 0; i < this.total; i++) result[i] = table[result[i]];
    }
    return result;
  }

  permOf(move: LayerMove): Int32Array {
    return this.perm(move.face, move.layer, move.turns, move.width);
  }

  fromState(state: CubeState): Uint8Array {
    const out = new Uint8Array(this.total);
    FACES.forEach((face, faceIndex) =>
      state[face].forEach(
        (color, i) => (out[faceIndex * this.faceSize + i] = COLOR_CODES.indexOf(color)),
      ),
    );
    return out;
  }

  toState(stickers: Uint8Array): CubeState {
    return Object.fromEntries(
      FACES.map((face, faceIndex) => [
        face,
        Array.from(
          stickers.subarray(faceIndex * this.faceSize, (faceIndex + 1) * this.faceSize),
          (code) => COLOR_CODES[code],
        ),
      ]),
    ) as unknown as CubeState;
  }

  /** Apply a permutation in place: the sticker at `i` moves to `perm[i]`. */
  static apply(stickers: Uint8Array, perm: Int32Array): void {
    const copy = stickers.slice();
    for (let i = 0; i < perm.length; i++) stickers[perm[i]] = copy[i];
  }
}

export const COLOR_CODES: readonly Color[] = [
  'white',
  'yellow',
  'red',
  'orange',
  'blue',
  'green',
  'unassigned',
];
