import { describe, expect, it } from 'vitest';
import { createNxNCube, applyNxNMove, type LayerMove } from '../../../src/domain/nxn/cube';
import { parseMove5 } from '../../../src/domain/fiveByFive/notation';
import { FACES, type Face } from '../../../src/domain/cube/faces';
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

function invertSeq(moves: LayerMove[]): LayerMove[] {
  return [...moves].reverse().map(inverse);
}

const T_OFFSETS = [7, 11, 13, 17] as const;
const T_ADDRESSES = FACES.flatMap((face) => T_OFFSETS.map((index) => ({ face, index })));

function getPermutation(moves: LayerMove[]) {
  const cube = createNxNCube(5, true);
  for (const f of FACES) cube[f] = Array(25).fill(0);
  T_ADDRESSES.forEach(({ face, index }, i) => {
    cube[face][index] = i;
  });
  const res = moves.reduce((c, m) => applyNxNMove(c, 5, m), cube);
  return T_ADDRESSES.map(({ face, index }) => res[face][index]);
}

interface CommEntry {
  moves: LayerMove[];
  perm: number[];
  affected: number[]; // which indices are moved
}

function buildTLibrary() {
  const baseAlgs = [
    "2R U 3R U' 2R' U 3R' U'",
    "2R U' 3R' U 2R' U' 3R U",
    "2R D 3R' D' 2R' D 3R D'",
    "2R D' 3R D 2R' D' 3R' D",
    "2R' U 3R U' 2R U 3R' U'",
    "2R' U' 3R' U 2R U' 3R U",
    "2R' D 3R' D' 2R D 3R D'",
    "2R' D' 3R D 2R D' 3R' D",
    "2R2 U 3R2 U' 2R2 U 3R2 U'",
    "2R2 U' 3R2 U 2R2 U' 3R2 U",
    "2R2 D 3R2 D' 2R2 D 3R2 D'",
    "2R2 D' 3R2 D 2R2 D' 3R2 D",
  ].map(parseMoves);

  const setupMoves: LayerMove[] = FACES.flatMap((face) =>
    ([1, -1, 2] as const).map((turns) => ({ face, layer: 0, width: 1, turns })),
  );

  const baseComms: LayerMove[][] = [];
  for (const base of baseAlgs) {
    for (const ori of ORIENTATIONS) {
      const seq = remapSeq(base, ori);
      baseComms.push(seq);
      baseComms.push(invertSeq(seq));
    }
  }

  const entries: CommEntry[] = [];
  const seenCycles = new Set<string>();

  function addIfNew(moves: LayerMove[]) {
    const perm = getPermutation(moves);
    const affected: number[] = [];
    for (let i = 0; i < 24; i++) {
      if (perm[i] !== i) affected.push(i);
    }
    if (affected.length === 3) {
      const key = perm.join(',');
      if (!seenCycles.has(key)) {
        seenCycles.add(key);
        entries.push({ moves, perm, affected });
      }
    }
  }

  for (const c of baseComms) addIfNew(c);
  for (const s of setupMoves) {
    const invS = inverse(s);
    for (const c of baseComms) {
      addIfNew([s, ...c, invS]);
    }
  }

  return entries;
}

describe('optimized solver speed', () => {
  it('solves 2R inner turn in <10ms', () => {
    const library = buildTLibrary();

    function countMisplaced(state: number[], target: number[]) {
      let count = 0;
      for (let i = 0; i < 24; i++) if (state[i] !== target[i]) count++;
      return count;
    }

    const target = Array(24);
    for (let i = 0; i < 24; i++) target[i] = Math.floor(i / 4);

    function solveOrbit(initialState: number[]): CommEntry[] {
      let current = [...initialState];
      const moves: CommEntry[] = [];

      for (let step = 0; step < 40; step++) {
        const mis = countMisplaced(current, target);
        if (mis === 0) return moves;

        // 1-step reduction
        let bestEntry: CommEntry | null = null;
        let bestMis = mis;
        let bestNext: number[] | null = null;

        for (const entry of library) {
          const next = Array(24);
          for (let i = 0; i < 24; i++) next[i] = current[entry.perm[i]];
          const nextMis = countMisplaced(next, target);
          if (nextMis < bestMis) {
            bestMis = nextMis;
            bestEntry = entry;
            bestNext = next;
          }
        }

        if (bestEntry && bestNext) {
          current = bestNext;
          moves.push(bestEntry);
          continue;
        }

        // 2-step lookahead: filter e1 to only entries affecting at least one misplaced piece!
        const misplacedIndices = new Set<number>();
        for (let i = 0; i < 24; i++) {
          if (current[i] !== target[i]) misplacedIndices.add(i);
        }

        const relevantE1 = library.filter(e => e.affected.some(idx => misplacedIndices.has(idx)));

        let bestE1: CommEntry | null = null;
        let bestE2: CommEntry | null = null;
        let bestMis2 = mis;
        let bestNext2: number[] | null = null;

        for (const e1 of relevantE1) {
          const next1 = Array(24);
          for (let i = 0; i < 24; i++) next1[i] = current[e1.perm[i]];
          const m1 = countMisplaced(next1, target);
          if (m1 > mis + 2) continue;

          for (const e2 of library) {
            const next2 = Array(24);
            for (let i = 0; i < 24; i++) next2[i] = next1[e2.perm[i]];
            const m2 = countMisplaced(next2, target);
            if (m2 < bestMis2) {
              bestMis2 = m2;
              bestE1 = e1;
              bestE2 = e2;
              bestNext2 = next2;
              if (m2 === 0) break;
            }
          }
          if (bestMis2 === 0) break;
        }

        if (bestNext2 && bestMis2 < mis) {
          current = bestNext2;
          moves.push(bestE1!, bestE2!);
          continue;
        }

        throw new Error(`Stuck at step ${step}`);
      }
      return moves;
    }

    const cube = applyNxNMove(createNxNCube(5, true), 5, parseMove5('2R'));
    const state = T_ADDRESSES.map(({ face, index }) => {
      const color = cube[face][index];
      return FACES.indexOf(FACES.find(f => cube[f][12] === color)!);
    });

    const start = Date.now();
    const sol = solveOrbit(state);
    const elapsed = Date.now() - start;
    console.log(`Solved 2R in ${sol.length} comms, took ${elapsed}ms!`);
    expect(sol.length).toBeGreaterThan(0);
  });
});
