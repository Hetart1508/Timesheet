import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createReportRouter } from '../src/modules/reports/report.routes.js';
import { ReportService } from '../src/modules/reports/report.service.js';

const auth = (req, _res, next) => { req.user = { id: 1, role: 'ADMIN' }; next(); };
const reportService = {
  analytics: vi.fn(async () => ({ daily: [], monthly: [], agents: [], companies: [] })),
  invoice: vi.fn(async () => ({ invoiceNumber: 'INV-7-202609', month: '2026-09', agent: { id: 7 }, items: [], totalVisits: 0, totalAmount: 0 })),
  toInvoicePdf: vi.fn(async () => Buffer.from('%PDF-test')),
};
const reportRepository = { auditInvoice: vi.fn() };
const passThroughAdmin = (_req, _res, next) => next();
const app = createApp({ adminRouter: passThroughAdmin, reportRouter: createReportRouter({ service: reportService, repository: reportRepository, authenticate: auth }) });

describe('Report API contracts', () => {
  beforeEach(() => { vi.clearAllMocks(); });

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

  it('returns a generated invoice PDF and audits its generation', async () => {
    const response = await request(app).get('/api/v1/admin/invoices/7?month=2026-09').expect(200);
    expect(response.headers['content-type']).toContain('application/pdf');
    expect(response.headers['content-disposition']).toContain('agent_invoice_7_2026-09.pdf');
    expect(response.body).toEqual(Buffer.from('%PDF-test'));
    expect(reportService.invoice).toHaveBeenCalledWith(7, '2026-09');
    expect(reportRepository.auditInvoice).toHaveBeenCalledWith(1, expect.objectContaining({ invoiceNumber: 'INV-7-202609' }), expect.anything());
  });

  it('rejects invalid invoice months before generation', async () => {
    await request(app).get('/api/v1/admin/invoices/7?month=2026-13').expect(422);
    expect(reportService.invoice).not.toHaveBeenCalled();
  });
});
