// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSolvedCube } from '../../../src/domain/cube/state';
import { runSolverWorker } from '../../../src/solver/workerClient';

afterEach(() => vi.useRealTimers());

describe('solver worker recovery', () => {
  it('terminates a silent worker and rejects after the time limit', async () => {
    vi.useFakeTimers();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
      onmessageerror: null,
    };
    const request = runSolverWorker(createSolvedCube(), () => worker as unknown as Worker, 1000);
    const outcome = expect(request.promise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await outcome;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
});
