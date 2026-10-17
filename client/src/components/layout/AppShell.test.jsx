import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import AppShell from './AppShell.jsx';

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({
    user: { role: 'AGENT', fullName: 'Taylor Agent' },
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
});