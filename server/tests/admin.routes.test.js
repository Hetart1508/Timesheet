import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createAdminRouter } from '../src/modules/admin/admin.routes.js';

const service = {
  dashboard: vi.fn(async () => ({ metrics: { pendingReviews: 0 }, pending: [] })),
  listTimesheets: vi.fn(async (filters) => ({ timesheets: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0 } })),
  workCalendar: vi.fn(async (month) => ({ month, agents: [] })),
  audits: vi.fn(async (filters) => ({ audits: [], pagination: { page: filters.page, pageSize: filters.pageSize, total: 0 } })),
};
const agentApp = createApp({ adminRouter: createAdminRouter({ service, authenticate: (req, _res, next) => { req.user = { id: 2, role: 'AGENT' }; next(); } }) });
const adminApp = createApp({ adminRouter: createAdminRouter({ service, authenticate: (req, _res, next) => { req.user = { id: 1, role: 'ADMIN' }; next(); } }) });

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

  it('accepts searchable, sortable, paginated Admin timesheet queries', async () => {
    await request(adminApp).get('/api/v1/admin/timesheets?search=asha&sortBy=agentName&sortOrder=asc&page=2&pageSize=50').expect(200);
    expect(service.listTimesheets).toHaveBeenLastCalledWith(expect.objectContaining({
      search: 'asha', sortBy: 'agentName', sortOrder: 'asc', page: 2, pageSize: 50,
    }));
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
