import type { CubeState } from '../domain/cube/types';
import type { Move } from '../domain/cube/moves';
import type { LayerMove } from '../domain/nxn/cube';

export type SolveRequest = { state: CubeState; size?: 3 } | { state: CubeState; size: 4 };
export type SolveResponse = { ok: true; moves: Move[] } | { ok: false; error: string };
export type FourSolveResponse = { ok: true; moves: LayerMove[] } | { ok: false; error: string };
