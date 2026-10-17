import ExcelJS from 'exceljs';
import { AppError } from '../../utils/app-error.js';
import { utcToIstTime } from '../../utils/business-time.js';

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const duration = (value) => ({ minutes: Number(value || 0), hours: Math.round((Number(value || 0) / 60) * 100) / 100 });

export function sanitizeForSpreadsheet(value) {
  if (value === null || value === undefined) return '';
  const text = String(value);
  return /^\s*[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

const exportColumns = [
  ['Timesheet ID', 'timesheetId'], ['Work Date', 'workDate'], ['Agent Name', 'agentName'], ['Agent Email', 'agentEmail'],
  ['Status', 'status'], ['Company', 'companyName'], ['Category', 'category'], ['Contact Person', 'contactPerson'], ['Purpose', 'purpose'],
  ['Visit Notes', 'visitNotes'], ['Check-In (IST)', 'checkInTime'], ['Check-Out (IST)', 'checkOutTime'],
  ['Duration (Minutes)', 'durationMinutes'], ['Duration (Hours)', 'durationHours'], ['Review Comments', 'reviewComment'],
];

const mapExport = (row) => ({
  timesheetId: Number(row.timesheet_id), workDate: dateOnly(row.work_date), agentName: sanitizeForSpreadsheet(row.agent_name),
  agentEmail: sanitizeForSpreadsheet(row.agent_email), status: row.status, companyName: sanitizeForSpreadsheet(row.company_name || ''),
  category: row.category || 'Silver', contactPerson: sanitizeForSpreadsheet(row.contact_person || ''), purpose: sanitizeForSpreadsheet(row.purpose || ''), visitNotes: sanitizeForSpreadsheet(row.visit_notes || ''),
  checkInTime: row.check_in_at ? utcToIstTime(row.check_in_at) : '', checkOutTime: row.check_out_at ? utcToIstTime(row.check_out_at) : '',
  durationMinutes: Number(row.duration_minutes || 0), durationHours: Math.round((Number(row.duration_minutes || 0) / 60) * 100) / 100,
  reviewComment: sanitizeForSpreadsheet(row.review_comment || ''),
});

export class ReportService {
  constructor(repository) { this.repository = repository; }
  validateRange(filters) { if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw new AppError(422, 'INVALID_DATE_RANGE', 'Start date must not be after end date'); }

  async analytics(filters) {
    this.validateRange(filters); const data = await this.repository.analytics(filters);
    return {
      daily: data.daily.map((r) => ({ workDate: dateOnly(r.work_date), activeAgents: Number(r.active_agents), timesheets: Number(r.timesheet_count), visits: Number(r.visit_count), duration: duration(r.duration_minutes), approved: Number(r.approved_count), pending: Number(r.pending_count) })),
      monthly: data.monthly.map((r) => ({ month: r.month_key, timesheets: Number(r.timesheet_count), visits: Number(r.visit_count), duration: duration(r.duration_minutes), approved: Number(r.approved_count), corrections: Number(r.correction_count) })),
      agents: data.agents.map((r) => ({ id: Number(r.agent_id), name: r.agent_name, email: r.agent_email, timesheets: Number(r.timesheet_count), approved: Number(r.approved_count), visits: Number(r.visit_count), companies: Number(r.companies_covered), duration: duration(r.duration_minutes) })),
      companies: data.companies.map((r) => ({ id: Number(r.company_id), name: r.company_name, contactPerson: r.contact_person || '', visits: Number(r.visit_count), agents: Number(r.agents_count), duration: duration(r.duration_minutes), lastVisited: r.last_visited_date ? dateOnly(r.last_visited_date) : null })),
    };
  }

  async rows(filters) { this.validateRange(filters); return (await this.repository.exportRows(filters)).map(mapExport); }

  toCsv(rows) {
    const quote = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
    return `\uFEFF${[exportColumns.map(([label]) => quote(label)), ...rows.map((row) => exportColumns.map(([, key]) => quote(row[key])))].map((line) => line.join(',')).join('\r\n')}`;
  }

  async toXlsx(rows) {
    const workbook = new ExcelJS.Workbook(); workbook.creator = 'Timesheet Management'; workbook.created = new Date();
    const sheet = workbook.addWorksheet('Timesheet Visits', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.columns = exportColumns.map(([header, key]) => ({ header, key, width: Math.min(42, Math.max(14, header.length + 4)) }));
    sheet.addRows(rows); sheet.autoFilter = { from: 'A1', to: `O${Math.max(1, rows.length + 1)}` };
    const header = sheet.getRow(1); header.height = 26; header.font = { bold: true, color: { argb: 'FFFFFFFF' } }; header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2875D1' } }; header.alignment = { vertical: 'middle' };
    sheet.getColumn('purpose').width = 32; sheet.getColumn('visitNotes').width = 42; sheet.getColumn('reviewComment').width = 36;
    ['purpose', 'visitNotes', 'reviewComment'].forEach((key) => { sheet.getColumn(key).alignment = { wrapText: true, vertical: 'top' }; });
    sheet.eachRow((row, rowNumber) => { if (rowNumber > 1 && rowNumber % 2 === 0) row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F8FC' } }; });
    return Buffer.from(await workbook.xlsx.writeBuffer());
  }
}
