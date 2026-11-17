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
import * as validator from '../../src/domain/threeByThree/validate';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('large cubes', () => {
  it('offers every size from 3×3 to 20×20', () => {
    render(<App />);
    const options = Array.from(
      (screen.getByLabelText('Cube size') as HTMLSelectElement).options,
    ).map((option) => option.textContent);
    expect(options).toHaveLength(18);
    expect(options[0]).toBe('3×3');
    expect(options[options.length - 1]).toBe('20×20');
  });

  it.each([6, 13, 20])('loads an example %i-layer cube and checks it', (size) => {
    render(<App />);
    fireEvent.change(screen.getByLabelText('Cube size'), { target: { value: String(size) } });
    expect(screen.getByText(`${6 * size * size} squares remaining to assign.`)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Load example' }));
    expect(screen.getByText('0 squares remaining to assign.')).toBeInTheDocument();
    expect(screen.getByText(/passes every reachability check/)).toBeInTheDocument();
    // Repaint one square with a different color: the totals no longer fit.
    const current = screen
      .getByRole('button', { name: /^Square:/ })
      .textContent!.replace('Square: ', '');
    const other = ['red', 'blue', 'yellow', 'green', 'white', 'orange'].find((c) => c !== current)!;
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`^${other}`) }));
    fireEvent.click(screen.getByRole('button', { name: /^Square:/ }));
    expect(
      screen.getByText(`Each color must appear exactly ${size * size} times.`),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    expect(screen.getByRole('alert')).toHaveTextContent(`exactly ${size * size} times`);
  });

  it('sends large cubes to the worker with their size and navigates long solutions', async () => {
    let instance: FakeWorker;
    let request: unknown;
    class FakeWorker {
      onmessage: ((event: { data: unknown }) => void) | null = null;
      onerror = null;
      onmessageerror = null;
      postMessage = vi.fn((message: unknown) => (request = message));
      terminate = vi.fn();
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        instance = this;
      }
    }
    vi.stubGlobal('Worker', FakeWorker);
    render(<App />);
    fireEvent.change(screen.getByLabelText('Cube size'), { target: { value: '5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Load example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    expect((request as { size: number }).size).toBe(5);
    const moves = Array.from({ length: 40 }, () => ({ face: 'R', layer: 2, width: 1, turns: 1 }));
    await act(async () => instance.onmessage?.({ data: { ok: true, moves } }));
    expect(screen.getByRole('region', { name: 'Verified solution' })).toBeInTheDocument();
    expect(screen.getByText(/Move 1 of 40/)).toBeInTheDocument();
    expect(screen.getByLabelText('Solution progress')).toHaveAttribute('value', '0');
    fireEvent.click(screen.getByRole('button', { name: 'Skip 10' }));
    expect(screen.getByText(/Move 11 of 40/)).toBeInTheDocument();
    expect(screen.getByLabelText('Solution progress')).toHaveAttribute('value', '10');
    fireEvent.change(screen.getByLabelText(/Go to move/), { target: { value: '40' } });
    fireEvent.click(screen.getByRole('button', { name: 'Go' }));
    expect(screen.getByText(/Move 40 of 40/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Auto-play' })).toBeEnabled();
    // Finishing without reaching a solved cube is reported, as for any playback.
    fireEvent.click(screen.getByRole('button', { name: 'Skip 10' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Playback did not reach a solved state');
    expect(validator).toBeDefined();
  });
});
