// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createSolvedCube } from '../../../src/domain/cube/state';
import { runFourSolverWorker, runSolverWorker } from '../../../src/solver/workerClient';
import { createNxNCube } from '../../../src/domain/nxn/cube';

afterEach(() => vi.useRealTimers());

describe('solver worker recovery', () => {
  it('terminates a silent 4x4 worker and rejects at its time limit', async () => {
    vi.useFakeTimers();
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null,
      onerror: null,
      onmessageerror: null,
    };
    const request = runFourSolverWorker(
      createNxNCube(4, true),
      () => worker as unknown as Worker,
      1000,
    );
    const outcome = expect(request.promise).rejects.toThrow('timed out');
    await vi.advanceTimersByTimeAsync(1000);
    await outcome;
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
  it('sends a 4x4 request and receives a structured response', async () => {
    const worker = {
      postMessage: vi.fn(),
      terminate: vi.fn(),
      onmessage: null as null | ((event: { data: { ok: true; moves: [] } }) => void),
      onerror: null,
      onmessageerror: null,
    };
    const state = createNxNCube(4, true);
    const request = runFourSolverWorker(state, () => worker as unknown as Worker);
    expect(worker.postMessage).toHaveBeenCalledWith({ size: 4, state });
    worker.onmessage?.({ data: { ok: true, moves: [] } });
    await expect(request.promise).resolves.toEqual({ ok: true, moves: [] });
    expect(worker.terminate).toHaveBeenCalledOnce();
  });
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
