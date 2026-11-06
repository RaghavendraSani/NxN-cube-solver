import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { CubeState } from '../../src/domain/cube/types';
import type { FaceletAddress } from '../../src/domain/cube/coordinates';

vi.mock('../../src/app/components/CubeViewport', () => ({
  CubeViewport: ({
    state,
    onSelect,
  }: {
    state: CubeState;
    onSelect: (address: FaceletAddress) => void;
  }) => (
    <button onClick={() => onSelect({ face: 'F', row: 0, column: 0 })}>Square: {state.F[0]}</button>
  ),
}));

import { App } from '../../src/app/App';
import * as validator from '../../src/domain/validation/validateCube';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('editor', () => {
  it('selects colors, paints one square, and repaints it', () => {
    render(<App />);
    expect(screen.getByRole('status')).toHaveTextContent('54 squares');
    fireEvent.click(screen.getByRole('button', { name: /green/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Square: unassigned' }));
    expect(screen.getByRole('button', { name: 'Square: green' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('53 squares');
    fireEvent.click(screen.getByRole('button', { name: /white/i }));
    fireEvent.click(screen.getByRole('button', { name: 'Square: green' }));
    expect(screen.getByRole('button', { name: 'Square: white' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('53 squares');
  });

  it('rejects incomplete input and clears the message after an edit', () => {
    const worker = vi.fn();
    vi.stubGlobal('Worker', worker);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Some squares have not been assigned.');
    expect(worker).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Square: unassigned' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('locks editing while solving and shows the returned solution', async () => {
    vi.spyOn(validator, 'validateCube').mockReturnValue({ valid: true });
    let instance: FakeWorker;
    class FakeWorker {
      onmessage:
        ((event: { data: { ok: true; moves: { face: 'R'; turns: 1 }[] } }) => void) | null = null;
      onerror = null;
      onmessageerror = null;
      postMessage = vi.fn();
      terminate = vi.fn();
      constructor() {
        // Keep the test's worker handle so it can simulate a message.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        instance = this;
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    expect(screen.getByText('Calculating solution…')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Solve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /red/i })).toBeDisabled();
    await act(async () =>
      instance.onmessage?.({ data: { ok: true, moves: [{ face: 'R', turns: 1 }] } }),
    );
    expect(screen.getByRole('region', { name: 'Verified solution' })).toHaveTextContent('R');
    expect(screen.getByText(/Hold your physical cube/)).toBeInTheDocument();
    expect(instance.terminate).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'New Cube' }));
    expect(screen.getByRole('button', { name: 'Solve' })).toBeEnabled();
  });

  it('reports a worker failure and allows the user to try again', async () => {
    vi.spyOn(validator, 'validateCube').mockReturnValue({ valid: true });
    let fail: (() => void) | null = null;
    class FailingWorker {
      onmessage = null;
      onmessageerror = null;
      set onerror(handler: () => void) {
        fail = handler;
      }
      postMessage = vi.fn();
      terminate = vi.fn();
    }
    vi.stubGlobal('Worker', FailingWorker);
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    await act(async () => {
      if (fail) fail();
    });
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to calculate a verified solution');
    expect(screen.getByRole('button', { name: 'Solve' })).toBeEnabled();
  });
});
