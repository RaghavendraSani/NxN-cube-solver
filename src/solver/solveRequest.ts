import { solveCube } from './solveCube';
import { solveFour, verifyFourSolution } from './fourByFour/solver';
import type { FourSolveResponse, SolveRequest, SolveResponse } from './protocol';

/** Called inside the worker; results are only returned after independent replay. */
export function handleSolveRequest(request: SolveRequest): SolveResponse | FourSolveResponse {
  try {
    if (request.size === 4) {
      const moves = solveFour(request.state);
      if (!verifyFourSolution(request.state, moves))
        throw new Error('Solution verification failed.');
      return { ok: true, moves };
    }
    if (request.size !== undefined && request.size !== 3) throw new Error('Unsupported cube size.');
    return { ok: true, moves: solveCube(request.state) };
  } catch {
    return { ok: false, error: 'Unable to calculate a verified solution.' };
  }
}
