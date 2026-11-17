import type { LayerMove } from '../../domain/nxn/cube';
import { FACES } from '../../domain/cube/faces';
import { COLOR_CODES, NxNEngine } from '../../domain/nxn/engine';
import { Conjugator } from './conjugator';
import { findBaseMacros } from './macros';
import { NxNStructure } from '../../domain/nxn/orbits';
import type { Scheme } from '../../domain/nxn/invariants';

const tables = new Map<string, Conjugator>();

function conjugatorFor(size: number, kind: 'center' | 'wing', index: number): Conjugator {
  const key = `${size}:${kind}:${index}`;
  let table = tables.get(key);
  if (!table) {
    const structure = NxNStructure.for(size);
    const macros = findBaseMacros(size);
    const base = (kind === 'center' ? macros.centers : macros.wings).get(index);
    if (!base) throw new Error('No macro for orbit.');
    const stickers =
      kind === 'center' ? structure.centerOrbits[index] : structure.wingPieceOrbits[index].stickers;
    tables.set(key, (table = new Conjugator(size, stickers, base, kind === 'wing')));
  }
  return table;
}

/**
 * Solve every center orbit. Each step swaps the colors of two center stickers (one wrong
 * sticker and the sticker holding the color it needs) through a pure 3-cycle whose third
 * sticker has the same color as the first, so nothing already correct is disturbed.
 */
export function solveCenters(
  size: number,
  stickers: Uint8Array,
  scheme: Scheme,
  moves: LayerMove[],
): void {
  const engine = NxNEngine.for(size);
  const structure = NxNStructure.for(size);
  const want = new Uint8Array(engine.total);
  FACES.forEach((face, f) =>
    want.fill(COLOR_CODES.indexOf(scheme[face]), f * engine.faceSize, (f + 1) * engine.faceSize),
  );
  const macros = findBaseMacros(size);
  structure.centerOrbits.forEach((orbit, index) => {
    if (!macros.centers.has(index)) return; // the fixed centers of odd cubes
    if (orbit.every((s) => stickers[s] === want[s])) return;
    const table = conjugatorFor(size, 'center', index);
    const count = orbit.length;
    for (;;) {
      if (orbit.every((s) => stickers[s] === want[s])) break;
      let bestCode = -1;
      let bestDelta = 0;
      let bestDistance = 127;
      const codes = table.reachable;
      for (let k = 0; k < codes.length; k++) {
        const code = codes[k];
        const z = code % count;
        const rest = (code - z) / count;
        const y = rest % count;
        const x = (rest - y) / count;
        const sx = orbit[x];
        const sy = orbit[y];
        const sz = orbit[z];
        // The sticker at x moves to y, y to z, z to x.
        const delta =
          (stickers[sx] === want[sy] ? 1 : 0) +
          (stickers[sy] === want[sz] ? 1 : 0) +
          (stickers[sz] === want[sx] ? 1 : 0) -
          (stickers[sx] === want[sx] ? 1 : 0) -
          (stickers[sy] === want[sy] ? 1 : 0) -
          (stickers[sz] === want[sz] ? 1 : 0);
        if (
          delta > bestDelta ||
          (delta === bestDelta && delta > 0 && table.distance[code] < bestDistance)
        ) {
          bestDelta = delta;
          bestCode = code;
          bestDistance = table.distance[code];
        }
      }
      if (bestCode < 0) throw new Error('Center orbit could not be solved.');
      const [x, y, z] = table.decode(bestCode);
      const cx = stickers[x];
      const cy = stickers[y];
      const cz = stickers[z];
      stickers[y] = cx;
      stickers[z] = cy;
      stickers[x] = cz;
      moves.push(...table.moves(bestCode));
    }
  });
}

/**
 * Solve every wing orbit except `skip` (the middle edges of an odd cube, which become the
 * edges of the reduced 3×3). Wings are distinguishable, so each step puts one wing home
 * with a 3-cycle through two other misplaced wings; parity preparation guarantees an even
 * permutation, so a third misplaced wing always exists. Scoring counts whole wings.
 */
export function solveWings(
  size: number,
  stickers: Uint8Array,
  target: Uint8Array,
  moves: LayerMove[],
  skip = -1,
): void {
  const structure = NxNStructure.for(size);
  const mates = structure.pieceMates;
  structure.wingPieceOrbits.forEach((orbit, index) => {
    if (index === skip) return;
    if (orbit.stickers.every((s) => stickers[s] === target[s])) return;
    const table = conjugatorFor(size, 'wing', index);
    const flipped = table.wrapsFlipped();
    const good = (s: number, color: number) => (color === target[s] ? 1 : 0);
    for (;;) {
      if (orbit.stickers.every((s) => stickers[s] === target[s])) break;
      let bestCode = -1;
      let bestScore = 0;
      const codes = table.reachable;
      for (let k = 0; k < codes.length; k++) {
        const code = codes[k];
        const [x, y, z] = table.decode(code);
        const mx = mates[x][0];
        const my = mates[y][0];
        const mz = mates[z][0];
        // Colors landing on the three wings: x→y, y→z, z→x (flipped swaps the mates).
        const nY = stickers[x];
        const nMy = stickers[mx];
        const nZ = stickers[y];
        const nMz = stickers[my];
        const nX = flipped ? stickers[mz] : stickers[z];
        const nMx = flipped ? stickers[z] : stickers[mz];
        const before =
          good(x, stickers[x]) * good(mx, stickers[mx]) +
          good(y, stickers[y]) * good(my, stickers[my]) +
          good(z, stickers[z]) * good(mz, stickers[mz]);
        const after =
          good(x, nX) * good(mx, nMx) + good(y, nY) * good(my, nMy) + good(z, nZ) * good(mz, nMz);
        const pieceDelta = after - before;
        if (pieceDelta <= 0) continue;
        const stickerDelta =
          good(x, nX) +
          good(mx, nMx) +
          good(y, nY) +
          good(my, nMy) +
          good(z, nZ) +
          good(mz, nMz) -
          (good(x, stickers[x]) +
            good(mx, stickers[mx]) +
            good(y, stickers[y]) +
            good(my, stickers[my]) +
            good(z, stickers[z]) +
            good(mz, stickers[mz]));
        const score = pieceDelta * 1000 + stickerDelta * 20 - table.distance[code];
        if (score > bestScore) {
          bestScore = score;
          bestCode = code;
        }
      }
      if (bestCode < 0) throw new Error('Wing orbit could not be solved.');
      const cycle = table.cycle(bestCode, structure);
      const colors = cycle.from.map((s) => stickers[s]);
      cycle.to.forEach((s, i) => (stickers[s] = colors[i]));
      moves.push(...table.moves(bestCode));
    }
  });
}
