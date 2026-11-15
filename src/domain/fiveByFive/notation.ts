import { FACES, type Face } from '../cube/faces';
import type { LayerMove } from '../nxn/cube';

/** Format outer turns, individual slices, and two- or three-layer wide turns. */
export function formatMove5(move: LayerMove): string {
  if (!FACES.includes(move.face) || ![1, -1, 2].includes(move.turns))
    throw new RangeError('Invalid 5x5 move.');
  let prefix = '';
  let wide = '';
  if (move.width === 1 && move.layer >= 0 && move.layer <= 2 && Number.isInteger(move.layer)) {
    prefix = move.layer === 0 ? '' : String(move.layer + 1);
  } else if (move.layer === 0 && (move.width === 2 || move.width === 3)) {
    prefix = move.width === 3 ? '3' : '';
    wide = 'w';
  } else throw new RangeError('Unsupported 5x5 layer range.');
  return `${prefix}${move.face}${wide}${move.turns === -1 ? "'" : move.turns === 2 ? '2' : ''}`;
}

/** Parse the supported 5×5 face, inner-slice, and wide-turn notation. */
export function parseMove5(text: string): LayerMove {
  const match = /^([23])?([URFDLB])(w)?(['2])?$/.exec(text);
  if (!match || (match[1] === '2' && match[3])) throw new RangeError('Invalid 5x5 notation.');
  return {
    face: match[2] as Face,
    layer: match[3] ? 0 : match[1] ? Number(match[1]) - 1 : 0,
    width: match[3] ? (match[1] === '3' ? 3 : 2) : 1,
    turns: match[4] === "'" ? -1 : match[4] === '2' ? 2 : 1,
  };
}
