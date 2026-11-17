import { FACES } from '../../../src/domain/cube/faces';
import type { CubeState } from '../../../src/domain/cube/types';
import { createNxNCube } from '../../../src/domain/nxn/cube';
import { NxNEngine } from '../../../src/domain/nxn/engine';

/** Small deterministic generator so failures are reproducible. */
export function random(seed: number) {
  let state = seed >>> 0;
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 2 ** 32;
}

export function scrambledStickers(size: number, seed: number, length = 60): Uint8Array {
  const engine = NxNEngine.for(size);
  const next = random(seed);
  const stickers = engine.fromState(createNxNCube(size, true));
  for (let i = 0; i < length; i++)
    NxNEngine.apply(
      stickers,
      engine.perm(
        FACES[Math.floor(next() * 6)],
        Math.floor(next() * size),
        ([1, -1, 2] as const)[Math.floor(next() * 3)],
      ),
    );
  return stickers;
}

export function scrambled(size: number, seed: number, length = 60): CubeState {
  return NxNEngine.for(size).toState(scrambledStickers(size, seed, length));
}
