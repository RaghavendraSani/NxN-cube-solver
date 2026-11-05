import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../../src/app/components/CubeViewport', () => ({
  CubeViewport: () => <div>Cube viewport</div>,
}));

import { App } from '../../src/app/App';

describe('application shell', () => {
  it('renders the milestone one placeholder', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'CubeSolver' })).toBeInTheDocument();
    expect(screen.getByText('Cube viewport')).toBeInTheDocument();
  });
});
