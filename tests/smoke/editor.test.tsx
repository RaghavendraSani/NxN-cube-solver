import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
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
});
