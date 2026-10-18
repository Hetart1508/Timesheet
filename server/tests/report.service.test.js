import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';
import { ReportService, sanitizeForSpreadsheet } from '../src/modules/reports/report.service.js';

const dangerousValues = ['=1+1', '+SUM(A1:A2)', '-2+3', '@cmd', '\t=payload', '  =hidden'];

describe('secure spreadsheet exports', () => {
  it('neutralizes every common spreadsheet formula prefix', () => {
    for (const value of dangerousValues) expect(sanitizeForSpreadsheet(value)).toBe(`'${value}`);
    expect(sanitizeForSpreadsheet('Normal company')).toBe('Normal company');
  });

  it('produces RFC-style quoted CSV with a UTF-8 BOM', () => {
    const service = new ReportService({});
    const csv = service.toCsv([{ timesheetId: 1, workDate: '2026-10-17', agentName: 'A "quoted" Agent', agentEmail: '', status: 'APPROVED', companyName: "'=1+1", category: 'Gold', contactPerson: '', purpose: 'Review, demo', visitNotes: '', checkInTime: '10:00', checkOutTime: '11:00', durationMinutes: 60, durationHours: 1, reviewComment: '' }]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain('"Category"');
    expect(csv).toContain('"Gold"');
    expect(csv).toContain('"A ""quoted"" Agent"');
    expect(csv).toContain('"Review, demo"');
    expect(csv).toContain('"\'=1+1"');
  });

  it('creates a valid styled XLSX workbook with frozen headers', async () => {
    const service = new ReportService({});
    const buffer = await service.toXlsx([{ timesheetId: 1, workDate: '2026-10-17', agentName: "'=1+1", agentEmail: 'safe@example.com', status: 'APPROVED', companyName: 'Acme', contactPerson: 'Ravi', purpose: 'Demo', visitNotes: 'Complete', checkInTime: '10:00', checkOutTime: '11:00', durationMinutes: 60, durationHours: 1, reviewComment: '' }]);
    expect(buffer.subarray(0, 2).toString()).toBe('PK');
    const workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('Timesheet Visits');
    expect(sheet.getCell('C2').value).toBe("'=1+1");
    expect(sheet.views[0]).toMatchObject({ state: 'frozen', ySplit: 1 });
  });

  it('rejects inverted report date ranges before querying', async () => {
    const repository = { analytics: vi.fn() };
    await expect(new ReportService(repository).analytics({ startDate: '2026-10-18', endDate: '2026-10-17' })).rejects.toMatchObject({ code: 'INVALID_DATE_RANGE' });
    expect(repository.analytics).not.toHaveBeenCalled();
  });
});

describe('monthly Agent invoices', () => {
  const invoiceRows = [
    { agent_id: 7, agent_name: 'Taylor Agent', agent_email: 'taylor@example.com', work_date: '2026-09-01', visit_id: 1, company_name: 'Gold Co', category: 'Gold', purpose: 'Visit', check_in_at: new Date('2026-09-01T04:30:00Z'), check_out_at: new Date('2026-09-01T05:30:00Z') },
    { agent_id: 7, agent_name: 'Taylor Agent', agent_email: 'taylor@example.com', work_date: '2026-09-02', visit_id: 2, company_name: 'Silver Co', category: 'Silver', purpose: 'Visit', check_in_at: new Date('2026-09-02T04:30:00Z'), check_out_at: new Date('2026-09-02T05:30:00Z') },
    { agent_id: 7, agent_name: 'Taylor Agent', agent_email: 'taylor@example.com', work_date: '2026-09-03', visit_id: 3, company_name: 'Bronze Co', category: 'Bronze', purpose: 'Visit', check_in_at: new Date('2026-09-03T04:30:00Z'), check_out_at: new Date('2026-09-03T05:30:00Z') },
  ];

  it('calculates the configured rates and formats visit times in IST', async () => {
    const repository = { invoiceRows: vi.fn(async () => invoiceRows) };
    const invoice = await new ReportService(repository).invoice(7, '2026-09');
    expect(invoice.items.map(({ rate }) => rate)).toEqual([1000, 800, 600]);
    expect(invoice.totalVisits).toBe(3);
    expect(invoice.totalAmount).toBe(2400);
    expect(invoice.items[0].checkInTime).toBe('10:00');
  });

  it('creates a PDF invoice document', async () => {
    const invoice = await new ReportService({ invoiceRows: vi.fn(async () => invoiceRows) }).invoice(7, '2026-09');
    const pdf = await new ReportService({}).toInvoicePdf(invoice);
    expect(pdf.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('rejects an invoice with no approved visits', async () => {
    const repository = { invoiceRows: vi.fn(async () => []) };
    await expect(new ReportService(repository).invoice(7, '2026-09')).rejects.toMatchObject({ code: 'INVOICE_NO_APPROVED_VISITS' });
  });
});
