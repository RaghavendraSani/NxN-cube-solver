import type { LayerMove } from '../../domain/nxn/cube';
import { NxNEngine } from '../../domain/nxn/engine';
import { invertMoves, type BaseMacro } from './macros';
import { NxNStructure } from '../../domain/nxn/orbits';

type Generator = { move: LayerMove; perm: Int32Array };

/**
 * Conjugation table for one orbit.
 *
 * If a macro `M` is a pure 3-cycle then `W⁻¹ · M · W` is a pure 3-cycle on the images of
 * `M`'s stickers under `W`, no matter what else `W` disturbs. A breadth-first search over
 * the images of three tracked stickers therefore yields, for every reachable ordered
 * triple, a shortest conjugating word. Wings are tracked by one sticker per wing; the
 * partner stickers follow because pieces move rigidly.
 */
export class Conjugator {
  readonly stickers: number[];
  readonly reachable: Int32Array;
  readonly distance: Int8Array;
  private readonly parent: Int32Array;
  private readonly via: Int16Array;
  private readonly generators: Generator[];
  private readonly local: Int16Array;
  private readonly count: number;
  /** Tracked sticker indices at the start state, and where the macro sends them. */
  private readonly tracked: number[];
  private readonly targets: number[];
  private readonly start: number;

  constructor(
    private readonly size: number,
    orbitStickers: readonly number[],
    private readonly base: BaseMacro,
    private readonly wings: boolean,
  ) {
    const engine = NxNEngine.for(size);
    const structure = NxNStructure.for(size);
    this.stickers = [...orbitStickers];
    this.count = this.stickers.length;
    this.local = new Int16Array(engine.total).fill(-1);
    this.stickers.forEach((s, k) => (this.local[s] = k));
    const destination = new Map<number, number>();
    base.from.forEach((s, i) => destination.set(s, base.to[i]));
    const a = base.from[0];
    const b = destination.get(a)!;
    const c = destination.get(b)!;
    const mate = (s: number) => structure.pieceMates[s][0];
    this.tracked = wings ? [a, b, c, mate(a), mate(b), mate(c)] : [a, b, c];
    this.targets = this.tracked.map((s) => destination.get(s)!);
    this.start = this.encode([a, b, c]);
    this.generators = [];
    for (const face of ['U', 'R', 'F'] as const)
      for (let layer = 0; layer < size; layer++)
        for (const turns of [1, -1, 2] as const) {
          const perm = engine.perm(face, layer, turns);
          if (this.stickers.some((s) => perm[s] !== s))
            this.generators.push({ move: { face, layer, width: 1, turns }, perm });
        }
    const states = this.count ** 3;
    this.distance = new Int8Array(states).fill(-1);
    this.parent = new Int32Array(states);
    this.via = new Int16Array(states);
    const queue: number[] = [this.start];
    this.distance[this.start] = 0;
    for (let head = 0; head < queue.length; head++) {
      const code = queue[head];
      const [x, y, z] = this.decodeLocal(code);
      for (let g = 0; g < this.generators.length; g++) {
        const perm = this.generators[g].perm;
        const next = this.encodeLocal(
          this.local[perm[this.stickers[x]]],
          this.local[perm[this.stickers[y]]],
          this.local[perm[this.stickers[z]]],
        );
        if (this.distance[next] < 0) {
          this.distance[next] = this.distance[code] + 1;
          this.parent[next] = code;
          this.via[next] = g;
          queue.push(next);
        }
      }
    }
    this.reachable = Int32Array.from(queue);
  }

  private encodeLocal(x: number, y: number, z: number): number {
    return (x * this.count + y) * this.count + z;
  }
  private decodeLocal(code: number): [number, number, number] {
    const z = code % this.count;
    const rest = (code - z) / this.count;
    return [Math.floor(rest / this.count), rest % this.count, z];
  }
  private encode(globals: [number, number, number]): number {
    return this.encodeLocal(this.local[globals[0]], this.local[globals[1]], this.local[globals[2]]);
  }

  /** Global sticker indices of the three tracked images for a state. */
  decode(code: number): [number, number, number] {
    const [x, y, z] = this.decodeLocal(code);
    return [this.stickers[x], this.stickers[y], this.stickers[z]];
  }

  /** The stickers moved by the conjugated macro: sticker `from[i]` moves to `to[i]`. */
  cycle(code: number, structure: NxNStructure): { from: number[]; to: number[] } {
    const [x, y, z] = this.decode(code);
    if (!this.wings) return { from: [x, y, z], to: [y, z, x] };
    const mate = (s: number) => structure.pieceMates[s][0];
    // The macro sends the third tracked sticker back onto the first wing, possibly flipped.
    const flipped = this.targets[2] !== this.tracked[0];
    return {
      from: [x, y, z, mate(x), mate(y), mate(z)],
      to: [y, z, flipped ? mate(x) : x, mate(y), mate(z), flipped ? x : mate(x)],
    };
  }

  /** Whether the macro sends its third wing back onto the first with stickers swapped. */
  wrapsFlipped(): boolean {
    return this.targets[2] !== this.tracked[0];
  }

  /** Moves realising the 3-cycle for the state: `W⁻¹ · M · W`. */
  moves(code: number): LayerMove[] {
    const word: LayerMove[] = [];
    for (let state = code; state !== this.start; state = this.parent[state])
      word.push(this.generators[this.via[state]].move);
    word.reverse();
    return [...invertMoves(word), ...this.base.moves, ...word];
  }
}
