import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createReportRouter } from '../src/modules/reports/report.routes.js';
import { ReportService } from '../src/modules/reports/report.service.js';

const auth = (req, _res, next) => { req.user = { id: 1, role: 'ADMIN' }; next(); };
const reportService = { analytics: vi.fn(async () => ({ daily: [], monthly: [], agents: [], companies: [] })) };
const passThroughAdmin = (_req, _res, next) => next();
const app = createApp({ adminRouter: passThroughAdmin, reportRouter: createReportRouter({ service: reportService, repository: {}, authenticate: auth }) });

describe('Report API contracts', () => {
  it('loads analytics without requiring an artificial GET body', async () => {
    const response = await request(app).get('/api/v1/admin/analytics').expect(200);
    expect(response.body.data).toEqual({ daily: [], monthly: [], agents: [], companies: [] });
    expect(reportService.analytics).toHaveBeenCalledWith({});
  });

  it('validates an inverted export date range through the service contract', async () => {
    const service = new ReportService({ analytics: vi.fn() });
    const localApp = createApp({ adminRouter: passThroughAdmin, reportRouter: createReportRouter({ service, repository: {}, authenticate: auth }) });
    const response = await request(localApp).get('/api/v1/admin/analytics?startDate=2026-10-18&endDate=2026-10-17').expect(422);
    expect(response.body.code).toBe('INVALID_DATE_RANGE');
  });
});
