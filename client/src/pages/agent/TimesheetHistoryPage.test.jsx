import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import TimesheetHistoryPage from './TimesheetHistoryPage.jsx';
import { agentApi } from '../../api/timesheets.js';

vi.mock('../../api/timesheets.js', async (importOriginal) => {
  const original = await importOriginal();
  return { ...original, agentApi: { ...original.agentApi, listTimesheets: vi.fn(), getTimesheet: vi.fn() } };
});
vi.mock('../../api/client.js', () => ({ errorMessage: (error) => error.message }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'AGENT', fullName: 'Taylor Agent' }, logout: async () => {} }),
}));

const result = {
  timesheets: [{ id: 12, workDate: '2026-10-16', visitCount: 2, duration: { minutes: 90, hours: 1.5 }, status: 'APPROVED', reviewComment: '' }],
  pagination: { page: 1, pageSize: 10, total: 61 },
};
const detail = {
  id: 12, workDate: '2026-10-16', status: 'APPROVED', dailySummary: 'Completed the scheduled customer visit and product review.',
  submittedAt: '2026-10-16T12:30:00.000Z', reviewComment: 'Looks good.',
  visits: [{ id: 9, companyName: 'Northwind Labs', category: 'Gold', contactPerson: 'Morgan Lee', purpose: 'Product demonstration',
    visitNotes: 'Reviewed the new workflow with the customer.', checkInTime: '10:00', checkOutTime: '11:00', duration: { minutes: 60, hours: 1 } }],
  reviews: [{ id: 3, decision: 'APPROVED', reviewerName: 'Morgan Admin', comment: 'Looks good.', createdAt: '2026-10-16T13:00:00.000Z' }],
};

afterEach(() => { cleanup(); vi.clearAllMocks(); });
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  agentApi.listTimesheets.mockResolvedValue(result);
  agentApi.getTimesheet.mockResolvedValue(detail);
});

describe('Agent timesheet history controls', () => {
  it('searches, sorts, filters, and pages like the Admin listing', async () => {
    render(<MemoryRouter><TimesheetHistoryPage /></MemoryRouter>);
    expect(await screen.findByRole('button', { name: 'View' })).toBeInTheDocument();
    expect(screen.getByText('16-10-2026')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search timesheets' }), { target: { value: 'Acme' } });
    await waitFor(() => expect(agentApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Acme', page: 1 })));

    fireEvent.click(screen.getByRole('button', { name: 'Duration' }));
    await waitFor(() => expect(agentApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'duration', sortOrder: 'asc' })));

    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));
    fireEvent.change(screen.getByLabelText('Status'), { target: { value: 'APPROVED' } });
    await waitFor(() => expect(agentApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'APPROVED', page: 1 })));

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(agentApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('previews a timesheet in a compact modal and restores focus when closed', async () => {
    render(<MemoryRouter><TimesheetHistoryPage /></MemoryRouter>);
    const viewButton = await screen.findByRole('button', { name: 'View' });
    viewButton.focus();
    fireEvent.click(viewButton);

    expect(await screen.findByRole('dialog', { name: 'Timesheet details' })).toBeInTheDocument();
    expect(agentApi.getTimesheet).toHaveBeenCalledWith(12);
    expect(screen.getByText('Northwind Labs')).toBeInTheDocument();
    expect(screen.getByText('Product demonstration')).toBeInTheDocument();
    expect(screen.getByText(/Completed the scheduled customer visit and product review\./)).toBeInTheDocument();
    expect(screen.getByText(/Reviewer feedback:/).closest('.alert')).toHaveClass('alert-info');
    expect(document.body.style.overflow).toBe('hidden');

    fireEvent.click(screen.getByRole('button', { name: 'Close timesheet preview' }));
    expect(screen.queryByRole('dialog', { name: 'Timesheet details' })).not.toBeInTheDocument();
    expect(viewButton).toHaveFocus();
    expect(document.body.style.overflow).toBe('');
  });
});
