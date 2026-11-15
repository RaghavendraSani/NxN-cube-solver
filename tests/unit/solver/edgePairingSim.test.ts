import { describe, it } from 'vitest';
import { createNxNCube, applyNxNMove, type LayerMove } from '../../../src/domain/nxn/cube';
import { findFiveCenterMoves, areFiveCentersSolved } from '../../../src/solver/fiveByFive/centers';
import { areFiveEdgesPaired } from '../../../src/domain/fiveByFive/reduce';
import { parseMove5 } from '../../../src/domain/fiveByFive/notation';
import type { Face } from '../../../src/domain/cube/faces';
import { FACES } from '../../../src/domain/cube/faces';
import { FACE_BASIS, rotateClockwise } from '../../../src/domain/cube/coordinates';

function parseMoves(s: string): LayerMove[] {
  return s.trim().split(/\s+/).filter(Boolean).map(parseMove5);
}

function buildOrientations(): Face[][] {
  const orientations: Face[][] = [[...FACES]];

  const seen = new Set([FACES.join('')]);
  for (let i = 0; i < orientations.length; i++) {
    for (const axis of [FACE_BASIS.R[0], FACE_BASIS.U[0]]) {
      const next = orientations[i].map((face) => {
        const normal = rotateClockwise(FACE_BASIS[face][0], axis);
        const result = FACES.find((c) => FACE_BASIS[c][0].every((v, j) => v === normal[j]));
        if (!result) throw new Error('Invalid orientation.');
        return result;
      });
      const key = next.join('');
      if (!seen.has(key)) {
        seen.add(key);
        orientations.push(next);
      }
    }
  }
  return orientations;
}

const ORIENTATIONS = buildOrientations();

function remapSeq(moves: LayerMove[], orientation: Face[]): LayerMove[] {
  return moves.map((m) => ({ ...m, face: orientation[FACES.indexOf(m.face)] }));
}

function inverse(m: LayerMove): LayerMove {
  return { ...m, turns: m.turns === 2 ? 2 : m.turns === 1 ? -1 : 1 };
}

describe('pair centered 2R', () => {
  it('pairs centered 2R', () => {
    const cube = applyNxNMove(createNxNCube(5, true), 5, {
      face: 'R',
      layer: 1,
      width: 1,
      turns: 1,
    });
    const centers = findFiveCenterMoves(cube, 8)!;
    const centered = centers.reduce((c, m) => applyNxNMove(c, 5, m), cube);

    // Build base pairing sequences:
    const flipAlg = "R U R' F R' F' R";
    const basePairingAlgs = [
      `2U' ${flipAlg} 2U`,
      `2D' ${flipAlg} 2D`,
      `2U ${flipAlg} 2U'`,
      `2D ${flipAlg} 2D'`,
      `2U2 ${flipAlg} 2U2`,
      `2D2 ${flipAlg} 2D2`,
    ].map(parseMoves);

    const setupMoves: LayerMove[] = FACES.flatMap((face) =>
      ([1, -1, 2] as const).map((turns) => ({ face, layer: 0, width: 1, turns })),
    );

    const library: LayerMove[][] = [];
    for (const base of basePairingAlgs) {
      for (const ori of ORIENTATIONS) {
        const remapped = remapSeq(base, ori);
        library.push(remapped);
        for (const s of setupMoves) {
          library.push([s, ...remapped, inverse(s)]);
        }
      }
    }

    // Parity:
    const baseParity = parseMoves("2R2 B2 U2 2L U2 2R' U2 2R U2 F2 2R F2 2L' B2 2R2");
    const parityAlgs = ORIENTATIONS.map((ori) => remapSeq(baseParity, ori));

    // Can depth 2 BFS pair all edges?
    console.log('Running BFS to find pairing...');
    let foundSeq: LayerMove[] | null = null;

    // Check depth 1:
    for (const s1 of library) {
      const c1 = s1.reduce((c, m) => applyNxNMove(c, 5, m), centered);
      if (areFiveEdgesPaired(c1) && areFiveCentersSolved(c1)) {
        foundSeq = s1;
        console.log('Found in depth 1!');
        break;
      }
    }

    if (!foundSeq) {
      // Check depth 2:
      console.log('Checking depth 2...');
      outer: for (const s1 of library) {
        const c1 = s1.reduce((c, m) => applyNxNMove(c, 5, m), centered);
        if (!areFiveCentersSolved(c1)) continue;
        for (const s2 of library) {
          const c2 = s2.reduce((c, m) => applyNxNMove(c, 5, m), c1);
          if (areFiveEdgesPaired(c2) && areFiveCentersSolved(c2)) {
            foundSeq = [...s1, ...s2];
            console.log('Found in depth 2!');
            break outer;
          }
        }
      }
    }

    if (!foundSeq) {
      // Check depth 1 with parity:
      console.log('Checking with parity...');
      outerP: for (const p of parityAlgs) {
        const cp = p.reduce((c, m) => applyNxNMove(c, 5, m), centered);
        if (areFiveEdgesPaired(cp) && areFiveCentersSolved(cp)) {
          foundSeq = p;
          console.log('Found with parity alone!');
          break;
        }
        for (const s of library) {
          const c = s.reduce((c, m) => applyNxNMove(c, 5, m), cp);
          if (areFiveEdgesPaired(c) && areFiveCentersSolved(c)) {
            foundSeq = [...p, ...s];
            console.log('Found with parity + 1 library move!');
            break outerP;
          }
        }
      }
    }

    console.log('Result foundSeq length:', foundSeq?.length);
  });
});
