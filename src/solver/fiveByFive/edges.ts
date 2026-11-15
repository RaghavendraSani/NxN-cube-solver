import type { CubeState } from '../../domain/cube/types';
import { applyNxNMove, type LayerMove } from '../../domain/nxn/cube';
import { areFiveEdgesPaired } from '../../domain/fiveByFive/reduce';
import { check5Entry } from '../../domain/fiveByFive/validate';
import { areFiveCentersSolved } from './centers';
import { parseMove5 } from '../../domain/fiveByFive/notation';
import { FACES, type Face } from '../../domain/cube/faces';
import { FACE_BASIS, rotateClockwise } from '../../domain/cube/coordinates';

function parseMoves(s: string): LayerMove[] {
  return s.trim().split(/\s+/).filter(Boolean).map(parseMove5);
}

function inverse(m: LayerMove): LayerMove {
  return { ...m, turns: m.turns === 2 ? 2 : m.turns === 1 ? -1 : 1 };
}

// 24 proper whole-cube rotations
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

// Wide turn pairing sequences from domain definition
const basePairing = parseMoves("Rw U R' U' Rw' F R F'");
const invPairing = [...basePairing].reverse().map(inverse);

const setupMoves: LayerMove[] = FACES.flatMap((face) =>
  ([1, -1, 2] as const).map((turns) => ({ face, layer: 0, width: 1, turns })),
);

const orientedPairings = ORIENTATIONS.flatMap((ori) => [
  remapSeq(basePairing, ori),
  remapSeq(invPairing, ori),
]);

export const pairingSequences: LayerMove[][] = orientedPairings.flatMap((seq) => [
  seq,
  ...setupMoves.map((s) => [s, ...seq, inverse(s)]),
]);

// Slice-flip-slice and parity algorithms
const flipAlg = "R U R' F R' F' R";
const sliceAlgs = [
  `2U' ${flipAlg} 2U`,
  `2D' ${flipAlg} 2D`,
  `2U ${flipAlg} 2U'`,
  `2D ${flipAlg} 2D'`,
  `2U2 ${flipAlg} 2U2`,
  `2D2 ${flipAlg} 2D2`,
].map(parseMoves);

const orientedSliceAlgs = sliceAlgs.flatMap((alg) =>
  ORIENTATIONS.map((ori) => remapSeq(alg, ori)),
);

const baseParity = parseMoves("2R2 B2 U2 2L U2 2R' U2 2R U2 F2 2R F2 2L' B2 2R2");
const parityAlgs: LayerMove[][] = ORIENTATIONS.map((ori) => remapSeq(baseParity, ori));

// 12 edges on 5x5:
const EDGES_12 = [
  { f1: 'U', i1: [21, 22, 23], f2: 'F', i2: [1, 2, 3] },
  { f1: 'U', i1: [9, 14, 19], f2: 'R', i2: [1, 2, 3] },
  { f1: 'U', i1: [1, 2, 3], f2: 'B', i2: [1, 2, 3] },
  { f1: 'U', i1: [5, 10, 15], f2: 'L', i2: [1, 2, 3] },

  { f1: 'D', i1: [1, 2, 3], f2: 'F', i2: [21, 22, 23] },
  { f1: 'D', i1: [9, 14, 19], f2: 'R', i2: [21, 22, 23] },
  { f1: 'D', i1: [21, 22, 23], f2: 'B', i2: [21, 22, 23] },
  { f1: 'D', i1: [5, 10, 15], f2: 'L', i2: [21, 22, 23] },

  { f1: 'F', i1: [9, 14, 19], f2: 'R', i2: [5, 10, 15] },
  { f1: 'F', i1: [5, 10, 15], f2: 'L', i2: [9, 14, 19] },
  { f1: 'B', i1: [5, 10, 15], f2: 'R', i2: [9, 14, 19] },
  { f1: 'B', i1: [9, 14, 19], f2: 'L', i2: [5, 10, 15] },
] as const;

function countPairedEdges(state: CubeState): number {
  let count = 0;
  for (const { f1, i1, f2, i2 } of EDGES_12) {
    const s1 = state[f1];
    const s2 = state[f2];
    if (
      s1[i1[0]] !== 'unassigned' &&
      s1[i1[0]] === s1[i1[1]] &&
      s1[i1[1]] === s1[i1[2]] &&
      s2[i2[0]] !== 'unassigned' &&
      s2[i2[0]] === s2[i2[1]] &&
      s2[i2[1]] === s2[i2[2]]
    ) {
      count++;
    }
  }
  return count;
}

/** Replay a proposed edge-pairing sequence and check its reduction invariants. */
export function verifyFiveEdgePairing(state: CubeState, moves: readonly LayerMove[]): boolean {
  try {
    if (check5Entry(state).status !== 'checks-ok' || !areFiveCentersSolved(state)) return false;
    const result = moves.reduce((cube, move) => applyNxNMove(cube, 5, move), state);
    return areFiveCentersSolved(result) && areFiveEdgesPaired(result);
  } catch {
    return false;
  }
}

/**
 * General 5×5 edge pairing engine.
 * Solves all 12 edge triplets while preserving centers and resolving wing parity.
 */
export function findFiveEdgePairing(
  state: CubeState,
  maxSequences?: number,
  maxNodes = 1000,
): LayerMove[] | null {
  if (check5Entry(state).status !== 'checks-ok' || !areFiveCentersSolved(state)) {
    throw new Error('5x5 entry must have solved centers.');
  }

  if (areFiveEdgesPaired(state)) return [];

  if (maxSequences === 0) return null;

  // 1. Fast direct 1-step check with pairing sequences (covers single-sequence cases in <20ms)
  for (const seq of pairingSequences) {
    const next = seq.reduce((c, m) => applyNxNMove(c, 5, m), state);
    if (areFiveCentersSolved(next) && areFiveEdgesPaired(next)) {
      return seq;
    }
  }

  // 2. Multi-step search if bounded search requested
  if (maxSequences !== undefined && maxSequences <= 2) {
    let nodes = 0;
    const visited = new Set<string>();

    function search(cube: CubeState, remaining: number): LayerMove[] | null {
      const key = FACES.map((f) => cube[f].join(',')).join('|');
      if (visited.has(key)) return null;
      visited.add(key);
      if (++nodes > maxNodes) return null;
      if (areFiveEdgesPaired(cube)) return [];
      if (remaining === 0) return null;

      for (const seq of pairingSequences) {
        if (nodes >= maxNodes) break;
        const next = seq.reduce((c, m) => applyNxNMove(c, 5, m), cube);
        if (!areFiveCentersSolved(next)) continue;
        const rest = search(next, remaining - 1);
        if (rest) return [...seq, ...rest];
      }
      return null;
    }

    const result = search(state, maxSequences);
    if (result) return result;
    if (maxSequences !== undefined) return null;
  }

  // 3. General greedy reduction with slice-flip-slice and parity resolution
  const library = [...orientedSliceAlgs, ...pairingSequences];
  let current = state;
  const allMoves: LayerMove[] = [];
  let parityUsed = false;

  const maxIterations = 50;
  for (let iter = 0; iter < maxIterations; iter++) {
    if (areFiveEdgesPaired(current)) break;

    const currentPaired = countPairedEdges(current);
    let bestMove: LayerMove[] | null = null;
    let bestPaired = currentPaired;
    let bestNext: CubeState | null = null;

    for (const seq of library) {
      const next = seq.reduce((c, m) => applyNxNMove(c, 5, m), current);
      const p = countPairedEdges(next);
      if (p > bestPaired && areFiveCentersSolved(next)) {
        bestPaired = p;
        bestMove = seq;
        bestNext = next;
        if (p === 12) break;
      }
    }

    if (bestMove && bestNext) {
      current = bestNext;
      allMoves.push(...bestMove);
      continue;
    }

    // Try parity resolution if stuck
    if (!parityUsed) {
      let parityProgress = false;
      for (const palg of parityAlgs) {
        const next = palg.reduce((c, m) => applyNxNMove(c, 5, m), current);
        if (areFiveEdgesPaired(next) && areFiveCentersSolved(next)) {
          current = next;
          allMoves.push(...palg);
          parityProgress = true;
          parityUsed = true;
          break;
        }

        for (const seq of library) {
          const next2 = seq.reduce((c, m) => applyNxNMove(c, 5, m), next);
          if (countPairedEdges(next2) > currentPaired && areFiveCentersSolved(next2)) {
            current = next;
            allMoves.push(...palg);
            parityProgress = true;
            parityUsed = true;
            break;
          }
        }
        if (parityProgress) break;
      }
      if (parityProgress) continue;
    }

    break;
  }

  if (verifyFiveEdgePairing(state, allMoves)) {
    return allMoves;
  }

  return null;
}
