import type { Color } from './colors';
import type { FaceletAddress } from './coordinates';
import { faceletToCoordinates } from './coordinates';
import { FACES } from './faces';
import type { CubeState } from './types';

export type PaletteColor = Exclude<Color, 'unassigned'>;
export const PALETTE_COLORS: readonly PaletteColor[] = [
  'red',
  'blue',
  'yellow',
  'green',
  'white',
  'orange',
];

export function paintFacelet(
  state: CubeState,
  address: FaceletAddress,
  color: PaletteColor,
): CubeState {
  faceletToCoordinates(address); // Validate the address before copying the face.
  const face = [...state[address.face]];
  face[address.row * 3 + address.column] = color;
  return { ...state, [address.face]: face };
}

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
