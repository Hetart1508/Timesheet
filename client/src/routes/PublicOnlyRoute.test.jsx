import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import PublicOnlyRoute from './PublicOnlyRoute.jsx';

const { authState } = vi.hoisted(() => ({ authState: { user: null, loading: false } }));

vi.mock('../context/AuthContext.jsx', () => ({
  useAuth: () => authState,
}));

afterEach(() => {
  cleanup();
  authState.user = null;
  authState.loading = false;
});

function renderRoute() {
  return render(
    <MemoryRouter initialEntries={['/register']}>
      <Routes>
        <Route element={<PublicOnlyRoute />}>
          <Route path="/register" element={<div>Registration page</div>} />
        </Route>
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('public-only routes', () => {
  it('lets a signed-out visitor use registration', () => {
    renderRoute();
    expect(screen.getByText('Registration page')).toBeInTheDocument();
  });

  it('replaces a registration history entry with the dashboard for an authenticated user', async () => {
    authState.user = { id: 1, role: 'ADMIN' };
    renderRoute();
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
    expect(screen.queryByText('Registration page')).not.toBeInTheDocument();
  });

  it('waits for session restoration before showing a public page', () => {
    authState.loading = true;
    renderRoute();
    expect(screen.getByRole('status')).toHaveTextContent('Checking your session');
    expect(screen.queryByText('Registration page')).not.toBeInTheDocument();
  });
});
