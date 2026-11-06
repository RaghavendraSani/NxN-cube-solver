import type { CubeState } from '../domain/cube/types';
import type { SolveResponse } from './protocol';

/** The timeout is a failure safeguard, not a user-facing cancellation control. */
export function runSolverWorker(state: CubeState, createWorker: () => Worker, timeoutMs = 120_000) {
  const worker = createWorker();
  let settled = false;
  let timer: ReturnType<typeof setTimeout>;
  const cleanup = () => {
    if (settled) return false;
    settled = true;
    clearTimeout(timer);
    worker.terminate();
    return true;
  };
  const promise = new Promise<SolveResponse>((resolve, reject) => {
    timer = setTimeout(() => {
      if (cleanup()) reject(new Error('Solver timed out.'));
    }, timeoutMs);
    worker.onmessage = (event: MessageEvent<SolveResponse>) => {
      if (cleanup()) resolve(event.data);
    };
    worker.onerror = () => {
      if (cleanup()) reject(new Error('Solver worker failed.'));
    };
    worker.onmessageerror = () => {
      if (cleanup()) reject(new Error('Solver response could not be read.'));
    };
    try {
      worker.postMessage({ state });
    } catch (error) {
      if (cleanup()) reject(error);
    }
  });
  return { promise, dispose: cleanup };
}
