import { solveCube } from '../solver/solveCube';
import type { SolveRequest, SolveResponse } from '../solver/protocol';

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  let response: SolveResponse;
  try {
    response = { ok: true, moves: solveCube(event.data.state) };
  } catch {
    response = { ok: false, error: 'Unable to calculate a verified solution.' };
  }
  self.postMessage(response);
};
