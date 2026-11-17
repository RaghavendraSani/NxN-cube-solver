import { solveCube } from './threeByThree/solver';
import { solveFour, verifyFourSolution } from './fourByFour/solver';
import { solveNxN } from './nxn/solveNxN';
import type { LayerSolveResponse, SolveRequest, SolveResponse } from './protocol';

/** Called inside the worker; results are only returned after independent replay. */
export function handleSolveRequest(request: SolveRequest): SolveResponse | LayerSolveResponse {
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
    // solveNxN replays its own result on the full cube before returning it.
    return { ok: true, moves: solveNxN(request.state, request.size) };
  } catch {
    return { ok: false, error: 'Unable to calculate a verified solution.' };
  }
}
