import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import AdminTimesheetsPage from './AdminTimesheetsPage.jsx';
import AuditLogPage from './AuditLogPage.jsx';
import AdminAgentsPage from './AdminAgentsPage.jsx';
import AdminCompaniesPage from './AdminCompaniesPage.jsx';
import TemporaryPage from './TemporaryPage.jsx';
import AnalyticsPage from './AnalyticsPage.jsx';
import CompanyDirectoryPage from '../shared/CompanyDirectoryPage.jsx';
import { adminApi } from '../../api/admin.js';
import { currentBusinessDate } from '../../utils/business-time.js';

vi.mock('../../api/admin.js', () => ({
  adminApi: { listTimesheets: vi.fn(), getTimesheet: vi.fn(), listAgents: vi.fn(), listAudits: vi.fn(), listCompanies: vi.fn(), listSessions: vi.fn(), analytics: vi.fn() },
}));
vi.mock('../../api/client.js', () => ({ errorMessage: (error) => error.message }));
vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: { role: 'ADMIN', fullName: 'Morgan Admin' }, logout: async () => {} }),
}));

const timesheetResult = {
  timesheets: [{ id: 12, agentName: 'Taylor Agent', agentEmail: 'taylor@example.com', workDate: '2026-10-16', visitCount: 2,
    duration: { minutes: 90, hours: 1.5 }, status: 'SUBMITTED', reviewerName: null }],
  pagination: { page: 1, pageSize: 10, total: 61 },
};
const timesheetDetail = {
  id: 12, workDate: '2026-10-16', status: 'SUBMITTED', dailySummary: 'Completed the scheduled customer visit and product review.',
  submittedAt: '2026-10-16T18:30:00.000Z', reviewComment: '', agent: { id: 4, fullName: 'Taylor Agent', username: 'taylor', email: 'taylor@example.com' },
  visits: [{ id: 9, companyName: 'Northwind Labs', category: 'Gold', contactPerson: 'Morgan Lee', purpose: 'Product demonstration',
    visitNotes: 'Reviewed the new workflow with the customer.', checkInTime: '10:00', checkOutTime: '11:00', duration: { minutes: 60, hours: 1 } }],
  reviews: [],
};
const auditResult = {
  audits: [{ id: 21, actorName: 'Morgan Admin', action: 'TIMESHEET_APPROVED', entityType: 'TIMESHEET', entityId: '12',
    before: { status: 'SUBMITTED' }, after: { status: 'APPROVED' }, ipAddress: '127.0.0.1', createdAt: '2026-10-16T18:28:00.000Z' }],
  pagination: { page: 1, pageSize: 10, total: 61 },
};
const agentsResult = { agents: [{ id: 4, fullName: 'Taylor Agent', username: 'taylor', email: 'taylor@example.com', emailVerified: true, status: 'ACTIVE', totalTimesheets: 3, totalVisits: 4, totalDuration: { minutes: 90, hours: 1.5 } }], pagination: { page: 1, pageSize: 100, total: 1 } };
const companiesResult = { companies: [{ id: 7, companyName: 'Northwind Labs', address: '14 Market Street', creatorName: 'Taylor Agent', status: 'ACTIVE', reviewStatus: 'APPROVED', visitCount: 2 }], pagination: { page: 1, pageSize: 100, total: 1 } };
const sessionsResult = { sessions: [{ id: 'session-1', userId: 4, fullName: 'Taylor Agent', email: 'taylor@example.com', role: 'AGENT', ipAddress: '2001:db8::8', ipVersion: 'IPv6', userAgent: 'Browser on Device', loginAt: '2026-10-19T12:00:00.000Z', lastUsedAt: null, status: 'ACTIVE' }], pagination: { page: 1, pageSize: 10, total: 1 } };

afterEach(() => { cleanup(); vi.clearAllMocks(); sessionStorage.removeItem('timesheet.clearFiltersOnReturn'); });
beforeEach(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  adminApi.listTimesheets.mockResolvedValue(timesheetResult);
  adminApi.getTimesheet.mockResolvedValue(timesheetDetail);
  adminApi.listAgents.mockResolvedValue(agentsResult);
  adminApi.listAudits.mockResolvedValue(auditResult);
  adminApi.listCompanies.mockResolvedValue(companiesResult);
  adminApi.listSessions.mockResolvedValue(sessionsResult);
  adminApi.analytics.mockResolvedValue({ daily: [{ workDate: '2026-10-16', duration: { minutes: 60, hours: 1 }, activeAgents: 1, timesheets: 1, visits: 1, approved: 0, pending: 1 }], monthly: [], agents: [], companies: [] });
});

describe('admin list table controls', () => {
  it('clears the review status filter when returning from an individual review', async () => {
    sessionStorage.setItem('timesheet.clearFiltersOnReturn', 'true');
    render(<MemoryRouter initialEntries={['/admin/reviews']}><AdminTimesheetsPage defaultStatus="SUBMITTED" /></MemoryRouter>);

    await waitFor(() => expect(adminApi.listTimesheets).toHaveBeenCalled());
    expect(adminApi.listTimesheets.mock.calls[0][0]).not.toHaveProperty('status');
    expect(sessionStorage.getItem('timesheet.clearFiltersOnReturn')).toBeNull();
    expect(screen.getByRole('heading', { name: 'All timesheets' })).toBeInTheDocument();
  });

  it('applies timesheet filters immediately and displays dates as DD/MM/YYYY', async () => {
    render(<MemoryRouter><AdminTimesheetsPage /></MemoryRouter>);
    await screen.findByRole('button', { name: 'Inspect' });
    fireEvent.click(screen.getByRole('button', { name: /Filters/ }));

    const from = screen.getByLabelText('From');
    expect(from).toHaveAttribute('max', currentBusinessDate());
    expect(screen.getByLabelText('To')).toHaveAttribute('max', currentBusinessDate());
    expect(from).toHaveAttribute('lang', 'en-GB');
    expect(screen.queryByRole('button', { name: 'Apply filters' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Agent'), { target: { value: '4' } });
    await waitFor(() => expect(adminApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ agentId: '4', page: 1 })));

    fireEvent.change(from, { target: { value: '2026-10-16' } });
    expect(screen.getByText('16/10/2026')).toBeInTheDocument();
    await waitFor(() => expect(adminApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ startDate: '2026-10-16', page: 1 })));
  });

  it('displays analytics picker dates as DD/MM/YYYY and blocks future selection', async () => {
    render(<MemoryRouter><AnalyticsPage /></MemoryRouter>);

    const from = screen.getByLabelText('Analytics from date');
    const to = screen.getByLabelText('Analytics to date');
    expect(from).toHaveAttribute('max', currentBusinessDate());
    expect(to).toHaveAttribute('max', currentBusinessDate());
    expect(from).toHaveAttribute('lang', 'en-GB');
    fireEvent.change(from, { target: { value: '2026-10-16' } });
    expect(screen.getByText('16/10/2026')).toBeInTheDocument();
    const chart = await screen.findByRole('img', { name: 'Recorded hours bar chart' });
    expect(chart).toHaveTextContent('16-10-2026');
    expect(chart).not.toHaveTextContent('10-16');
  });

  it('opens and closes the full timesheet inspection in a modal', async () => {
    render(<MemoryRouter initialEntries={['/admin/timesheets']}><Routes>
      <Route path="/admin/timesheets" element={<AdminTimesheetsPage />} />
    </Routes></MemoryRouter>);
    await screen.findByText('Taylor Agent');

    const inspectButton = screen.getByRole('button', { name: 'Inspect' });
    inspectButton.focus();
    fireEvent.click(inspectButton);
    expect(await screen.findByRole('dialog', { name: 'Timesheet preview' })).toBeInTheDocument();
    expect(await screen.findByRole('heading', { name: 'Taylor Agent' })).toBeInTheDocument();
    expect(screen.getByText('Northwind Labs')).toBeInTheDocument();
    expect(screen.getByText('Product demonstration')).toBeInTheDocument();
    expect(screen.getByText((_, element) => element.tagName === 'P' && element.textContent.includes('Completed the scheduled customer visit and product review.'))).toBeInTheDocument();
    expect(adminApi.getTimesheet).toHaveBeenCalledWith(12);

    fireEvent.click(screen.getByRole('button', { name: 'Close timesheet preview' }));
    expect(screen.queryByRole('dialog', { name: 'Timesheet preview' })).not.toBeInTheDocument();
    expect(inspectButton).toHaveFocus();
  });

  it('searches, sorts, and pages timesheets', async () => {
    render(<MemoryRouter><AdminTimesheetsPage /></MemoryRouter>);
    await screen.findByText('Taylor Agent');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search agent or reviewer' }), { target: { value: 'Taylor' } });
    await waitFor(() => expect(adminApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Taylor', page: 1 })));

    fireEvent.click(screen.getByRole('button', { name: 'Agent' }));
    await waitFor(() => expect(adminApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'agentName', sortOrder: 'asc' })));

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(adminApi.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));
  });

  it('searches, sorts, pages, and expands audit records', async () => {
    render(<MemoryRouter><AuditLogPage /></MemoryRouter>);
    await screen.findByText('TIMESHEET_APPROVED');

    fireEvent.change(screen.getByRole('searchbox', { name: 'Search audit records' }), { target: { value: 'Morgan' } });
    await waitFor(() => expect(adminApi.listAudits).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Morgan', page: 1 })));

    fireEvent.click(screen.getByRole('button', { name: 'Actor' }));
    await waitFor(() => expect(adminApi.listAudits).toHaveBeenLastCalledWith(expect.objectContaining({ sortBy: 'actorName', sortOrder: 'asc' })));

    fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
    await waitFor(() => expect(adminApi.listAudits).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 })));

    fireEvent.click(screen.getByText('View changes'));
    expect(screen.getByRole('region', { name: 'Change summary' })).toHaveTextContent('Status');
    expect(screen.getByRole('region', { name: 'Change summary' })).toHaveTextContent('Submitted');
    expect(screen.getByRole('region', { name: 'Change summary' })).toHaveTextContent('Approved');
    expect(screen.queryByText(/"status"/)).not.toBeInTheDocument();
  });

  it('automatically searches the Agent directory and Company list', async () => {
    const { unmount } = render(<MemoryRouter><AdminAgentsPage /></MemoryRouter>);
    await screen.findByText('@taylor');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search agents' }), { target: { value: 'Taylor' } });
    await waitFor(() => expect(adminApi.listAgents).toHaveBeenLastCalledWith({ search: 'Taylor', pageSize: 100 }));

    unmount();
    const { unmount: unmountAdminCompanies } = render(<MemoryRouter><AdminCompaniesPage /></MemoryRouter>);
    await screen.findByText('Northwind Labs');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search companies' }), { target: { value: 'Northwind' } });
    await waitFor(() => expect(adminApi.listCompanies).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Northwind', pageSize: 100 })));

    unmountAdminCompanies();
    unmount();
    render(<MemoryRouter><CompanyDirectoryPage /></MemoryRouter>);
    await screen.findByText('Northwind Labs');
    fireEvent.change(screen.getByRole('searchbox', { name: 'Search companies' }), { target: { value: 'Northwind' } });
    await waitFor(() => expect(adminApi.listCompanies).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'Northwind', pageSize: 100 })));
    expect(screen.queryByRole('button', { name: 'Search' })).not.toBeInTheDocument();
  });

  it('shows user device sessions and applies session filters', async () => {
    render(<MemoryRouter><TemporaryPage /></MemoryRouter>);
    expect(await screen.findByText('taylor@example.com')).toBeInTheDocument();
    expect(screen.getByText('2001:db8::8')).toBeInTheDocument();
    expect(screen.getByText('Browser on Device')).toBeInTheDocument();
    expect(screen.getByText('10 per page')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: 'Filter sessions by role' }), { target: { value: 'AGENT' } });
    await waitFor(() => expect(adminApi.listSessions).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'AGENT', page: 1, pageSize: 10 })));
  });
});
