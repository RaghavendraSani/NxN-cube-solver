import type { CubeState } from '../domain/cube/types';
import type { Move } from '../domain/cube/moves';
import type { LayerMove } from '../domain/nxn/cube';

/** Size 3 (the default) returns face turns; sizes 4 to 20 return layer moves. */
export type SolveRequest = { state: CubeState; size?: 3 } | { state: CubeState; size: number };
export type SolveResponse = { ok: true; moves: Move[] } | { ok: false; error: string };
export type LayerSolveResponse = { ok: true; moves: LayerMove[] } | { ok: false; error: string };
export type FourSolveResponse = LayerSolveResponse;
