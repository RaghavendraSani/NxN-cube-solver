import { FACES, type Face } from '../cube/faces';
import type { LayerMove } from './cube';

/**
 * Notation for any N×N×N cube: `R` is the outer layer, `2R` the second layer from the
 * right face, `Rw` the outer two layers, `3Rw` the outer three, and `2-4R` layers two to
 * four. A trailing `'` is counterclockwise and `2` a half turn.
 */
export function formatMoveN(move: LayerMove): string {
  if (!FACES.includes(move.face) || ![1, -1, 2].includes(move.turns))
    throw new RangeError('Invalid move.');
  if (
    !Number.isInteger(move.layer) ||
    !Number.isInteger(move.width) ||
    move.layer < 0 ||
    move.width < 1
  )
    throw new RangeError('Invalid layer range.');
  let prefix = '';
  let wide = '';
  if (move.width === 1) prefix = move.layer === 0 ? '' : String(move.layer + 1);
  else if (move.layer === 0) {
    prefix = move.width === 2 ? '' : String(move.width);
    wide = 'w';
  } else prefix = `${move.layer + 1}-${move.layer + move.width}`;
  return `${prefix}${move.face}${wide}${move.turns === -1 ? "'" : move.turns === 2 ? '2' : ''}`;
}

/** Parse the notation produced by `formatMoveN`. */
export function parseMoveN(text: string): LayerMove {
  const match = /^(?:(\d+)-(\d+)|(\d+))?([URFDLB])(w)?(['2])?$/.exec(text);
  if (!match) throw new RangeError('Invalid notation.');
  const [, from, to, count, face, wide, suffix] = match;
  let layer = 0;
  let width = 1;
  if (from !== undefined) {
    layer = Number(from) - 1;
    width = Number(to) - Number(from) + 1;
    if (wide || width < 2 || layer < 0) throw new RangeError('Invalid layer range.');
  } else if (wide) width = count === undefined ? 2 : Number(count);
  else if (count !== undefined) layer = Number(count) - 1;
  if (width < 1 || layer < 0) throw new RangeError('Invalid layer range.');
  return {
    face: face as Face,
    layer,
    width,
    turns: suffix === "'" ? -1 : suffix === '2' ? 2 : 1,
  };
}
