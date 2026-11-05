import type { Color } from './colors';
import type { CubeState } from './types';

/** Standard scheme: white up, green front, red right. */
export function createSolvedCube(): CubeState {
  return {
    U: Array<Color>(9).fill('white'),
    R: Array<Color>(9).fill('red'),
    F: Array<Color>(9).fill('green'),
    D: Array<Color>(9).fill('yellow'),
    L: Array<Color>(9).fill('orange'),
    B: Array<Color>(9).fill('blue'),
  };
}

export function createUnassignedCube(): CubeState {
  return {
    U: Array<Color>(9).fill('unassigned'),
    R: Array<Color>(9).fill('unassigned'),
    F: Array<Color>(9).fill('unassigned'),
    D: Array<Color>(9).fill('unassigned'),
    L: Array<Color>(9).fill('unassigned'),
    B: Array<Color>(9).fill('unassigned'),
  };
}
