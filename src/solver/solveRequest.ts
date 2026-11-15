import { solveCube } from './threeByThree/solver';
import { solveFour, verifyFourSolution } from './fourByFour/solver';
import { solveFive } from './fiveByFive/solver';
import type { FiveSolveResponse, FourSolveResponse, SolveRequest, SolveResponse } from './protocol';

/** Called inside the worker; results are only returned after independent replay. */
export function handleSolveRequest(
  request: SolveRequest,
): SolveResponse | FourSolveResponse | FiveSolveResponse {
  try {
    if (request.size === undefined || request.size === 3) {
      return { ok: true, moves: solveCube(request.state) };
    }
    if (request.size === 4) {
      const moves = solveFour(request.state);
      if (!verifyFourSolution(request.state, moves))
        throw new Error('Solution verification failed.');
      return { ok: true, moves };
    }
    if (request.size === 5) return { ok: true, moves: solveFive(request.state) };
    throw new Error('Unsupported cube size.');
  } catch {
    return { ok: false, error: 'Unable to calculate a verified solution.' };
  }
}
