import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createCompanyRouter } from '../src/modules/companies/company.routes.js';

const company = { id: 7, companyName: 'Northwind Labs', address: '14 Market Street', status: 'ACTIVE', reviewStatus: 'PENDING' };
const service = {
  list: vi.fn(async () => ({ companies: [company], pagination: { page: 1, pageSize: 20, total: 1 } })),
  listMine: vi.fn(async () => ({ companies: [company], pagination: { page: 1, pageSize: 20, total: 1 } })),
  create: vi.fn(async () => company),
  update: vi.fn(async () => company),
  delete: vi.fn(async () => ({ ...company, status: 'INACTIVE' })),
};

function appFor(role) {
  return createApp({ companyRouter: createCompanyRouter({
    service,
    authenticate: (req, _res, next) => { req.user = { id: role === 'ADMIN' ? 1 : 2, role }; next(); },
  }) });
}

const withCsrf = (requestBuilder) => requestBuilder.set('Cookie', 'ts_csrf=test-token').set('X-CSRF-Token', 'test-token');
const companyPayload = { companyName: 'Northwind Labs', address: '14 Market Street', contactPerson: 'Asha Patel', contactPhone: '', notes: '' };

describe('Company API', () => {
  it('lets Agents read their company submissions, but not Admin-only company lists', async () => {
    const agentResponse = await request(appFor('AGENT')).get('/api/v1/companies/mine').expect(200);
    expect(agentResponse.body.data.companies).toHaveLength(1);
    await request(appFor('ADMIN')).get('/api/v1/companies/mine').expect(403);
  });

  it('supports CSRF-protected create, update, and soft-delete requests', async () => {
    const app = appFor('AGENT');
    await withCsrf(request(app).post('/api/v1/companies').send(companyPayload)).expect(201);
    await withCsrf(request(app).put('/api/v1/companies/7').send(companyPayload)).expect(200);
    const deleted = await withCsrf(request(app).delete('/api/v1/companies/7')).expect(200);
    expect(deleted.body.data.company.status).toBe('INACTIVE');
    expect(service.create).toHaveBeenCalledWith(companyPayload, expect.objectContaining({ id: 2, role: 'AGENT' }), expect.any(Object));
    expect(service.update).toHaveBeenCalledWith(7, companyPayload, expect.objectContaining({ id: 2, role: 'AGENT' }), expect.any(Object));
    expect(service.delete).toHaveBeenCalledWith(7, expect.objectContaining({ id: 2, role: 'AGENT' }), expect.any(Object));
  });

  it('routes Admin company creation through the same audited service', async () => {
    await withCsrf(request(appFor('ADMIN')).post('/api/v1/companies').send(companyPayload)).expect(201);
    expect(service.create).toHaveBeenCalledWith(companyPayload, expect.objectContaining({ id: 1, role: 'ADMIN' }), expect.any(Object));
  });

  it('rejects writes without a matching CSRF cookie and header', async () => {
    await request(appFor('ADMIN')).post('/api/v1/companies').send(companyPayload).expect(403);
  });
});