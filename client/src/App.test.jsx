import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

afterEach(cleanup);

describe('authentication pages', () => {
  it('renders the sign-in workflow', async () => {
    render(<MemoryRouter initialEntries={['/login']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Agent sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Agent email')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Use secure Admin sign in' })).toHaveAttribute('href', '/admin/login');
  });

  it('renders the protected Admin sign-in workflow', async () => {
    render(<MemoryRouter initialEntries={['/admin/login']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Admin email')).toBeInTheDocument();
    expect(screen.getByText('Two-step verification is required for every Admin sign-in.')).toBeInTheDocument();
  });

  it('renders the one-time Admin registration workflow', async () => {
    render(<MemoryRouter initialEntries={['/admin/register']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Create the Admin account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Admin email')).toBeInTheDocument();
    expect(screen.getByText('Only one Admin account can be created for this system.')).toBeInTheDocument();
  });
});
