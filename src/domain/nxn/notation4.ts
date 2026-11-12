import { FACES, type Face } from '../cube/faces';
import type { LayerMove } from './cube';

/** 4x4 notation: R = outer, 2R = inner slice, Rw = outer two layers. */
export function formatMove4(move: LayerMove): string {
  if (!FACES.includes(move.face) || ![1, -1, 2].includes(move.turns))
    throw new RangeError('Invalid 4x4 move.');
  let prefix = '';
  let wide = '';
  if (move.layer === 1 && move.width === 1) prefix = '2';
  else if (move.layer === 0 && move.width === 2) wide = 'w';
  else if (move.layer !== 0 || move.width !== 1)
    throw new RangeError('Unsupported 4x4 layer range.');
  return `${prefix}${move.face}${wide}${move.turns === -1 ? "'" : move.turns === 2 ? '2' : ''}`;
}

/** Parse the supported outer, inner-slice, and wide 4×4 moves. */
export function parseMove4(text: string): LayerMove {
  const match = /^(2)?([URFDLB])(w)?(['2])?$/.exec(text);
  if (!match || (match[1] && match[3])) throw new RangeError('Invalid 4x4 notation.');
  return {
    face: match[2] as Face,
    layer: match[1] ? 1 : 0,
    width: match[3] ? 2 : 1,
    turns: match[4] === "'" ? -1 : match[4] === '2' ? 2 : 1,
  };
}
