import type { Face } from './faces';

/** Positive one is clockwise as viewed from outside the named face. */
export type Move = Readonly<{ face: Face; turns: 1 | -1 | 2 }>;

/** Return the turn that undoes this move. */
export function inverseMove(move: Move): Move {
  return { face: move.face, turns: move.turns === 2 ? 2 : move.turns === 1 ? -1 : 1 };
}
