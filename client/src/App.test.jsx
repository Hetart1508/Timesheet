import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import App from './App.jsx';

describe('foundation page', () => {
  it('shows the current implementation phase', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'The foundation is ready.' })).toBeInTheDocument();
    expect(screen.getByText(/Phase 1/)).toBeInTheDocument();
  });
});
