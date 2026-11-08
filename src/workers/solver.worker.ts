import { handleSolveRequest } from '../solver/solveRequest';
import type { SolveRequest } from '../solver/protocol';

self.onmessage = (event: MessageEvent<SolveRequest>) => {
  self.postMessage(handleSolveRequest(event.data));
};
