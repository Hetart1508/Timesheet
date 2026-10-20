import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

vi.mock('./context/AuthContext.jsx', () => ({
  AuthProvider: ({ children }) => children,
  useAuth: () => ({
    user: null,
    loading: false,
    login: vi.fn(),
    requestAdminLogin: vi.fn(),
    verifyAdminLogin: vi.fn(),
  }),
}));

afterEach(cleanup);

describe('authentication pages', () => {
  it('renders the sign-in workflow', async () => {
    render(<MemoryRouter initialEntries={['/login/agent']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Agent sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Agent email')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Use secure Admin sign in' })).not.toBeInTheDocument();
  });

  it('renders the protected Admin sign-in workflow', async () => {
    render(<MemoryRouter initialEntries={['/login/admin']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
    expect(screen.getByLabelText('Admin email')).toBeInTheDocument();
    expect(screen.getByText('Two-step verification is required for every Admin sign-in.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Use Agent sign in' })).toHaveAttribute('href', '/login/agent');
  });

  it('keeps legacy sign-in URLs working', async () => {
    render(<MemoryRouter initialEntries={['/admin/login']}><App /></MemoryRouter>);
    expect(await screen.findByRole('heading', { name: 'Admin sign in' })).toBeInTheDocument();
  });

  it('renders the one-time Admin registration workflow', async () => {
    render(<MemoryRouter initialEntries={['/admin/register']}><App /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Create the Admin account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Admin email')).toBeInTheDocument();
    expect(screen.getByText('Only one Admin account can be created for this system.')).toBeInTheDocument();
  });
});
