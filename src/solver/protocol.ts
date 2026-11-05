import type { CubeState } from '../domain/cube/types';
import type { Move } from '../domain/cube/moves';

export type SolveRequest = { state: CubeState };
export type SolveResponse = { ok: true; moves: Move[] } | { ok: false; error: string };
