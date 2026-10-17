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
