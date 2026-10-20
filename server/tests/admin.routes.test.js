import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createAdminRouter } from '../src/modules/admin/admin.routes.js';

const service = {
  dashboard: vi.fn(async () => ({ metrics: { pendingReviews: 0 }, pending: [] })),
  listTimesheets: vi.fn(async (filters) => ({ timesheets: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0 } })),
  workCalendar: vi.fn(async (month) => ({ month, agents: [] })),
  audits: vi.fn(async (filters) => ({ audits: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0 } })),
  sessions: vi.fn(async (filters) => ({ sessions: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0 } })),
};
const agentImportService = {
  template: vi.fn(async () => Buffer.from('template')),
  invitations: vi.fn(async () => [{ id: 4, fullName: 'Asha Patel', email: 'asha@example.com', status: 'SENT' }]),
};
const agentApp = createApp({ adminRouter: createAdminRouter({ service, agentImportService, authenticate: (req, _res, next) => { req.user = { id: 2, role: 'AGENT' }; next(); } }) });
const adminApp = createApp({ adminRouter: createAdminRouter({ service, agentImportService, authenticate: (req, _res, next) => { req.user = { id: 1, role: 'ADMIN' }; next(); } }) });

describe('Admin API authorization', () => {
  it('rejects an authenticated Agent from Admin endpoints', async () => {
    const response = await request(agentApp).get('/api/v1/admin/dashboard').expect(403);
    expect(response.body.code).toBe('FORBIDDEN');
  });

  it('allows an authenticated Admin to load the operations dashboard', async () => {
    const response = await request(adminApp).get('/api/v1/admin/dashboard').expect(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.metrics.pendingReviews).toBe(0);
  });

  it('allows an authenticated Admin to load Agent invitations and blocks Agents', async () => {
    const response = await request(adminApp).get('/api/v1/admin/imports/agents/invitations').expect(200);
    expect(response.body.data.invitations).toHaveLength(1);
    expect(agentImportService.invitations).toHaveBeenCalled();
    await request(agentApp).get('/api/v1/admin/imports/agents/invitations').expect(403);
  });

  it('accepts searchable, sortable, paginated Admin timesheet queries', async () => {
    await request(adminApp).get('/api/v1/admin/timesheets?search=asha&sortBy=agentName&sortOrder=asc&page=2&pageSize=50').expect(200);
    expect(service.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'asha', sortBy: 'agentName', sortOrder: 'asc', page: 2, pageSize: 50,
    }));
  });

  it('defaults Admin list pagination to 10 rows', async () => {
    await request(adminApp).get('/api/v1/admin/timesheets').expect(200);
    expect(service.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 10 }));
  });

  it('filters and pages Admin session listings while blocking Agents', async () => {
    await request(adminApp).get('/api/v1/admin/sessions?search=asha&role=AGENT&status=ACTIVE&page=2').expect(200);
    expect(service.sessions).toHaveBeenLastCalledWith(expect.objectContaining({ search: 'asha', role: 'AGENT', status: 'ACTIVE', page: 2, pageSize: 10 }));
    await request(agentApp).get('/api/v1/admin/sessions').expect(403);
  });

  it('loads the approved-hours work calendar for a valid month', async () => {
    const response = await request(adminApp).get('/api/v1/admin/work-calendar?month=2026-10&agentId=42').expect(200);
    expect(response.body.data.month).toBe('2026-10');
    expect(service.workCalendar).toHaveBeenLastCalledWith('2026-10', 42);
  });

  it('rejects an invalid work-calendar month', async () => {
    service.workCalendar.mockClear();
    await request(adminApp).get('/api/v1/admin/work-calendar?month=2026-13').expect(422);
    expect(service.workCalendar).not.toHaveBeenCalled();
  });

  it('accepts searchable, sortable, paginated Admin audit queries', async () => {
    await request(adminApp).get('/api/v1/admin/audits?search=asha&action=TIMESHEET&sortBy=actorName&sortOrder=asc&page=3&pageSize=100').expect(200);
    expect(service.audits).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'asha', action: 'TIMESHEET', sortBy: 'actorName', sortOrder: 'asc', page: 3, pageSize: 100,
    }));
  });
});
