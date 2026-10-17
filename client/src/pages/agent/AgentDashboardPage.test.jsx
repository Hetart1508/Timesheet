import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AgentDashboardPage from './AgentDashboardPage.jsx';
import { agentApi } from '../../api/timesheets.js';

vi.mock('../../api/timesheets.js', () => ({
  agentApi: { dashboard: vi.fn(), startTimesheet: vi.fn() },
  formatDuration: () => '0 min',
  formatWorkDate: (value) => value,
}));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'AGENT', fullName: 'Taylor Agent' }, logout: async () => {} }),
}));

afterEach(cleanup);

function CurrentRoute() {
  const { pathname } = useLocation();
  return <output data-testid="current-route">{pathname}</output>;
}

describe('Agent daily timesheet selection', () => {
  beforeEach(() => {
    agentApi.dashboard.mockResolvedValue({ businessDate: '2026-10-17', today: null, recent: [] });
    agentApi.startTimesheet.mockResolvedValue({ id: 42 });
  });

  it('creates or opens the selected day before entering visits', async () => {
    render(<MemoryRouter initialEntries={['/dashboard']}><CurrentRoute /><AgentDashboardPage /></MemoryRouter>);
    const datePicker = await screen.findByLabelText('Timesheet date');
    expect(datePicker).toHaveValue('2026-10-17');

    fireEvent.change(datePicker, { target: { value: '2026-10-16' } });
    fireEvent.click(screen.getByRole('button', { name: 'Open selected day' }));

    await waitFor(() => expect(agentApi.startTimesheet).toHaveBeenCalledWith('2026-10-16'));
    expect(await screen.findByTestId('current-route')).toHaveTextContent('/timesheets/42');
  });
});