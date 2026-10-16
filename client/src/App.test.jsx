import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

describe('authentication pages', () => {
  it('renders the sign-in workflow', async () => {
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Sign in to your workspace' })).toBeInTheDocument();
    expect(screen.getByLabelText('Username or email')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toBeInTheDocument();
  });
});
