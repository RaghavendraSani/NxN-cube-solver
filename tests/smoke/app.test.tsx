import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { App } from '../../src/app/App';

describe('application shell', () => {
  it('renders the milestone one placeholder', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: 'CubeSolver' })).toBeInTheDocument();
    expect(screen.getByText(/Milestone 1/i)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(/implementation has not started/i);
  });
});
