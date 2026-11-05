import { cleanup, fireEvent, render, screen } from '@testing-library/react';
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

afterEach(cleanup);

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
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Invalid state. Try again.');
    fireEvent.click(screen.getByRole('button', { name: 'Square: unassigned' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('acknowledges valid input without claiming to calculate a solution', () => {
    vi.spyOn(validator, 'validateCube').mockReturnValue({ valid: true });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Solve' }));
    expect(
      screen.getByText(/Valid cube. Solution calculation will be available/),
    ).toBeInTheDocument();
  });
});
