import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { role: 'ADMIN', fullName: 'Morgan Admin' },
    logout: vi.fn(),
  }),
}));

afterEach(cleanup);

describe('AppShell mobile navigation', () => {
  it('moves focus into the menu and restores it after Escape', () => {
    render(<MemoryRouter><AppShell><h1>Workspace</h1></AppShell></MemoryRouter>);
    const menuButton = screen.getByRole('button', { name: 'Open navigation' });
    fireEvent.click(menuButton);

    const closeButton = screen.getByRole('button', { name: 'Close navigation' });
    expect(closeButton).toHaveFocus();
    expect(menuButton).toHaveAttribute('aria-expanded', 'true');

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(menuButton).toHaveFocus();
    expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  });

  it('provides a skip link to the main content', () => {
    render(<MemoryRouter><AppShell><h1>Workspace</h1></AppShell></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main-content');
  });

  it('keeps Reviews separate from Timesheets and opens the Agent directory', async () => {
    render(<MemoryRouter initialEntries={['/admin/reviews']}><AppShell><Routes>
      <Route path="/admin/reviews" element={<h1>Review queue</h1>} />
      <Route path="/admin/timesheets" element={<h1>All timesheets</h1>} />
      <Route path="/admin/agents" element={<h1>Agent directory</h1>} />
    </Routes></AppShell></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Reviews' })).toHaveClass('active');
    expect(screen.getByRole('link', { name: 'Timesheets' })).not.toHaveClass('active');
    fireEvent.click(screen.getByRole('link', { name: 'Agents' }));
    expect(await screen.findByRole('heading', { name: 'Agent directory' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Agents' })).toHaveClass('active');
  });

  it('shows the Work calendar in Admin navigation', () => {
    render(<MemoryRouter><AppShell><h1>Workspace</h1></AppShell></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Work calendar' })).toHaveAttribute('href', '/admin/work-calendar');
  });
});