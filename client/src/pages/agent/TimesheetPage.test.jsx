import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimesheetPage from './TimesheetPage.jsx';
import { agentApi } from '../../api/timesheets.js';

vi.mock('../../api/timesheets.js', () => ({
  agentApi: {
    getTimesheet: vi.fn(), listCompanies: vi.fn(), addVisit: vi.fn(), updateVisit: vi.fn(),
  },
  formatDuration: ({ minutes = 0 } = {}) => `${minutes} min`,
  formatWorkDate: (value) => value,
  statusLabels: { DRAFT: 'Draft' },
}));
vi.mock('../../api/client.js', () => ({ errorMessage: (error) => error.message, fieldErrors: () => ({}) }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'AGENT', fullName: 'Taylor Agent' }, logout: async () => {} }),
}));

afterEach(() => { cleanup(); vi.useRealTimers(); });
beforeEach(() => {
  agentApi.getTimesheet.mockResolvedValue({ id: 5, workDate: '2026-10-16', status: 'DRAFT', dailySummary: '', reviewComment: '', visits: [] });
  agentApi.listCompanies.mockReset();
  agentApi.listCompanies.mockResolvedValueOnce([{ id: 1, companyName: 'Existing Company', reviewStatus: 'APPROVED', contactPerson: '' }]);
});

describe('Timesheet company search', () => {
  it('disables submission until a non-draft timesheet is edited', async () => {
    agentApi.getTimesheet.mockResolvedValue({
      id: 5, workDate: '2026-10-16', status: 'SUBMITTED',
      dailySummary: 'Completed customer visits and scheduled follow-ups.', reviewComment: '',
      visits: [{ id: 1, companyName: 'Existing Company', duration: { minutes: 30 }, checkInTime: '10:00', checkOutTime: '10:30', category: 'Gold', purpose: 'Follow-up', visitNotes: 'Discussed next steps.', contactPerson: 'Ravi' }],
    });
    render(<MemoryRouter initialEntries={['/timesheets/5']}><Routes><Route path="/timesheets/:id" element={<TimesheetPage />} /></Routes></MemoryRouter>);

    expect(await screen.findByRole('button', { name: 'Submitted for review' })).toBeDisabled();
  });

  it('shows company suggestions after a 500ms debounce', async () => {
    render(<MemoryRouter initialEntries={['/timesheets/5']}><Routes><Route path="/timesheets/:id" element={<TimesheetPage />} /></Routes></MemoryRouter>);
    fireEvent.click(await screen.findByRole('button', { name: 'Add visit' }));
    const search = await screen.findByRole('searchbox', { name: 'Search companies' });
    agentApi.listCompanies.mockResolvedValueOnce([{ id: 2, companyName: 'Northwind Field', address: '2 Main Street', reviewStatus: 'APPROVED', contactPerson: 'Jordan Lee' }]);
    vi.useFakeTimers();

    fireEvent.change(search, { target: { value: 'north' } });
    expect(agentApi.listCompanies).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Northwind Field/ })).not.toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(499); });
    expect(agentApi.listCompanies).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('button', { name: /Northwind Field/ })).not.toBeInTheDocument();

    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(agentApi.listCompanies).toHaveBeenLastCalledWith('north');
    expect(screen.getByRole('button', { name: /Northwind Field/ })).toBeInTheDocument();
  });

  it('searches on Enter and makes matching companies selectable', async () => {
    agentApi.listCompanies.mockResolvedValueOnce([{ id: 2, companyName: 'Northwind Field', reviewStatus: 'APPROVED', contactPerson: 'Jordan Lee' }]);
    render(<MemoryRouter initialEntries={['/timesheets/5']}><Routes><Route path="/timesheets/:id" element={<TimesheetPage />} /></Routes></MemoryRouter>);

    fireEvent.click(await screen.findByRole('button', { name: 'Add visit' }));
    const category = screen.getByRole('combobox', { name: 'Category' });
    expect(category).toHaveValue('');
    expect(screen.getByRole('option', { name: 'Gold' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Silver' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Bronze' })).toBeInTheDocument();
    const companySelect = await screen.findByRole('combobox', { name: 'Company' });
    await screen.findByRole('option', { name: 'Existing Company' });
    fireEvent.change(companySelect, { target: { value: '1' } });
    const search = await screen.findByRole('searchbox', { name: 'Search companies' });
    fireEvent.change(search, { target: { value: 'north' } });
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });

    await waitFor(() => expect(agentApi.listCompanies).toHaveBeenCalledWith('north'));
    expect(await screen.findByRole('option', { name: 'Northwind Field' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Existing Company' })).toBeInTheDocument();
    expect(companySelect).toHaveValue('1');
    fireEvent.keyDown(search, { key: 'Enter', code: 'Enter' });
    expect(companySelect).toHaveValue('2');
    expect(agentApi.addVisit).not.toHaveBeenCalled();
  });
});