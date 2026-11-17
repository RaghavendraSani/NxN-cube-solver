// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FACES } from '../../../src/domain/cube/faces';
import { applyNxNMove, createNxNCube, type LayerMove } from '../../../src/domain/nxn/cube';
import { applyMovesFast } from '../../../src/domain/nxn/applyMoves';
import { NxNEngine } from '../../../src/domain/nxn/engine';
import { NxNStructure } from '../../../src/domain/nxn/orbits';
import { createExampleCube } from '../../../src/domain/nxn/example';
import { findBaseMacros } from '../../../src/solver/nxn/macros';
import { Conjugator } from '../../../src/solver/nxn/conjugator';
import { random } from './helpers';

function labelled(size: number) {
  return Object.fromEntries(
    FACES.map((face) => [face, Array.from({ length: size * size }, (_, i) => `${face}${i}`)]),
  ) as never;
}

describe('sticker permutation engine', () => {
  it.each([3, 4, 5, 8, 20])('agrees with the domain move rules on a %i-layer cube', (size) => {
    const engine = NxNEngine.for(size);
    const next = random(size);
    const turns = [1, -1, 2] as const;
    const moves: LayerMove[] = Array.from({ length: size > 8 ? 12 : 40 }, () => {
      const layer = Math.floor(next() * size);
      return {
        face: FACES[Math.floor(next() * 6)],
        layer,
        width: 1 + Math.floor(next() * Math.min(3, size - layer)),
        turns: turns[Math.floor(next() * 3)],
      };
    });
    // Where every sticker came from, according to each implementation.
    let origins = Array.from({ length: engine.total }, (_, i) => i);
    for (const move of moves) {
      const perm = engine.permOf(move);
      const out = origins.slice();
      for (let i = 0; i < perm.length; i++) out[perm[i]] = origins[i];
      origins = out;
    }
    const domain = moves.reduce((state, move) => applyNxNMove(state, size, move), labelled(size));
    const expected = FACES.flatMap((face) =>
      (domain as Record<string, string[]>)[face].map((label) => {
        const source = FACES.indexOf(label[0] as (typeof FACES)[number]);
        return source * size * size + Number(label.slice(1));
      }),
    );
    expect(origins).toEqual(expected);
  });

  it('applies whole solutions identically to the slow domain rules', () => {
    for (const size of [3, 5]) {
      const start = createExampleCube(size);
      const moves: LayerMove[] = [
        { face: 'R', layer: 0, width: 1, turns: 1 },
        { face: 'U', layer: Math.floor(size / 2), width: 1, turns: -1 },
        { face: 'F', layer: 0, width: 1, turns: 2 },
      ];
      expect(applyMovesFast(start, size, moves)).toEqual(
        moves.reduce((state, move) => applyNxNMove(state, size, move), start),
      );
    }
  });

  it('builds example cubes that are scrambled but reachable', () => {
    for (const size of [3, 4, 7, 20]) {
      const cube = createExampleCube(size);
      expect(cube).not.toEqual(createNxNCube(size, true));
      expect(createExampleCube(size)).toEqual(cube);
    }
  });
});

describe('orbit structure', () => {
  it('finds the expected orbits', () => {
    const five = NxNStructure.for(5);
    expect(five.centerOrbits.map((o) => o.length).sort()).toEqual([24, 24, 6]);
    expect(five.wingPieceOrbits.map((o) => o.pieces.length)).toEqual([24, 12]);
    const twenty = NxNStructure.for(20);
    expect(twenty.centerOrbits).toHaveLength(81);
    expect(twenty.centerOrbits.every((o) => o.length === 24)).toBe(true);
    expect(twenty.wingPieceOrbits).toHaveLength(9);
  });

  it('never mixes orbits when a layer turns', () => {
    for (const size of [5, 6, 9]) {
      const engine = NxNEngine.for(size);
      const structure = NxNStructure.for(size);
      for (const face of FACES)
        for (let layer = 0; layer < size; layer++) {
          const perm = engine.perm(face, layer, 1);
          for (let i = 0; i < perm.length; i++)
            if (structure.kind[i] === 'center')
              expect(structure.orbitOf[perm[i]]).toBe(structure.orbitOf[i]);
        }
    }
  });
});

describe('pure macros', () => {
  it.each([5, 6, 7])('are exact 3-cycles on a %i-layer cube after conjugation', (size) => {
    const engine = NxNEngine.for(size);
    const structure = NxNStructure.for(size);
    const macros = findBaseMacros(size);
    const next = random(size * 3);
    const check = (table: Conjugator) => {
      for (let trial = 0; trial < 25; trial++) {
        const code = table.reachable[Math.floor(next() * table.reachable.length)];
        let state = Array.from({ length: engine.total }, (_, i) => i);
        for (const move of table.moves(code)) {
          const perm = engine.permOf(move);
          const out = state.slice();
          for (let i = 0; i < perm.length; i++) out[perm[i]] = state[i];
          state = out;
        }
        const expected = Array.from({ length: engine.total }, (_, i) => i);
        const cycle = table.cycle(code, structure);
        cycle.from.forEach((from, i) => (expected[cycle.to[i]] = from));
        expect(state).toEqual(expected);
      }
    };
    for (const [index, base] of macros.centers)
      check(new Conjugator(size, structure.centerOrbits[index], base, false));
    for (const [index, base] of macros.wings)
      check(new Conjugator(size, structure.wingPieceOrbits[index].stickers, base, true));
  });
});
