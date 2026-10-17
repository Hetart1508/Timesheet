import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createAdminRouter } from '../src/modules/admin/admin.routes.js';

const service = { dashboard: vi.fn(async () => ({ metrics: { pendingReviews: 0 }, pending: [] })) };
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
});
