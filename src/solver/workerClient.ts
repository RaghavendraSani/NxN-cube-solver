import type { CubeState } from '../domain/cube/types';
import type { FourSolveResponse, SolveRequest, SolveResponse } from './protocol';

/** The timeout is a failure safeguard, not a user-facing cancellation control. */
export function runSolverWorker(state: CubeState, createWorker: () => Worker, timeoutMs = 120_000) {
  return runWorker<SolveResponse>({ state }, createWorker, timeoutMs);
}

/** Run a 4×4 solve with the same timeout and cleanup behavior as 3×3. */
export function runFourSolverWorker(
  state: CubeState,
  createWorker: () => Worker,
  timeoutMs = 120_000,
) {
  return runWorker<FourSolveResponse>({ size: 4, state }, createWorker, timeoutMs);
}

/** Settle a worker request once and release it on success, failure, or timeout. */
function runWorker<Response>(request: SolveRequest, createWorker: () => Worker, timeoutMs: number) {
  const worker = createWorker();
  let settled = false;
  let timer: ReturnType<typeof setTimeout>;
  // The first result or failure owns cleanup; later worker events are ignored.
  const cleanup = () => {
    if (settled) return false;
    settled = true;
    clearTimeout(timer);
    worker.terminate();
    return true;
  };
  const promise = new Promise<Response>((resolve, reject) => {
    timer = setTimeout(() => {
      if (cleanup()) reject(new Error('Solver timed out.'));
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<Response>) => {
      if (cleanup()) resolve(event.data);
    };
    worker.onerror = () => {
      if (cleanup()) reject(new Error('Solver worker failed.'));
    };
    worker.onmessageerror = () => {
      if (cleanup()) reject(new Error('Solver response could not be read.'));
    };
    try {
      worker.postMessage(request);
    } catch (error) {
      if (cleanup()) reject(error);
    }
  });
  return { promise, dispose: cleanup };
}
