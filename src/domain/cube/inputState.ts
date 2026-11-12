import type { Color } from './colors';
import type { FaceletAddress } from './coordinates';
import { faceletToCoordinates } from './coordinates';
import { FACES } from './faces';
import type { CubeState } from './types';
import { toNxNCoordinates } from '../nxn/cube';

export type PaletteColor = Exclude<Color, 'unassigned'>;
export const PALETTE_COLORS: readonly PaletteColor[] = [
  'red',
  'blue',
  'yellow',
  'green',
  'white',
  'orange',
];

/** Paint one validated facelet without changing the input cube. */
export function paintFacelet(
  state: CubeState,
  address: FaceletAddress,
  color: PaletteColor,
  size = 3,
): CubeState {
  if (size === 3) faceletToCoordinates(address);
  else toNxNCoordinates(address, size);
  const face = [...state[address.face]];
  face[address.row * size + address.column] = color;
  return { ...state, [address.face]: face };
}

/** Count assigned and unassigned facelets across all six faces. */
export function countColors(state: CubeState): Record<Color, number> {
  const counts: Record<Color, number> = {
    red: 0,
    blue: 0,
    yellow: 0,
    green: 0,
    white: 0,
    orange: 0,
    unassigned: 0,
  };
  for (const face of FACES) for (const color of state[face]) counts[color]++;
  return counts;
}
