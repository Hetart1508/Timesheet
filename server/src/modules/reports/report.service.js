import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { AppError } from '../../utils/app-error.js';
import { currentBusinessDate, utcToIstTime } from '../../utils/business-time.js';

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const duration = (value) => ({ minutes: Number(value || 0), hours: Math.round((Number(value || 0) / 60) * 100) / 100 });
export const invoiceRates = Object.freeze({ Gold: 1000, Silver: 800, Bronze: 600 });
const invoiceAmount = (value) => `INR ${Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

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
  validateRange(filters) {
    const today = currentBusinessDate();
    if ((filters.startDate && filters.startDate > today) || (filters.endDate && filters.endDate > today)) throw new AppError(422, 'FUTURE_DATE_NOT_ALLOWED', 'Report dates cannot be in the future');
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw new AppError(422, 'INVALID_DATE_RANGE', 'Start date must not be after end date');
  }

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

  async invoice(agentId, month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) throw new AppError(422, 'INVALID_INVOICE_MONTH', 'Use a valid month in YYYY-MM format');
    const rows = await this.repository.invoiceRows(agentId, month);
    if (!rows.length) throw new AppError(404, 'INVOICE_NO_APPROVED_VISITS', 'No approved visits were found for this Agent and month');
    const items = rows.map((row) => {
      const category = invoiceRates[row.category] ? row.category : 'Silver';
      const rate = invoiceRates[category];
      return {
        visitId: Number(row.visit_id), workDate: dateOnly(row.work_date), companyName: row.company_name,
        purpose: row.purpose, category, checkInTime: utcToIstTime(row.check_in_at), checkOutTime: utcToIstTime(row.check_out_at),
        rate, amount: rate,
      };
    });
    const totalAmount = items.reduce((sum, item) => sum + item.amount, 0);
    return {
      invoiceNumber: `INV-${agentId}-${month.replace('-', '')}`, generatedOn: currentBusinessDate(), month,
      agent: { id: Number(rows[0].agent_id), fullName: rows[0].agent_name, email: rows[0].agent_email },
      items, totalVisits: items.length, totalAmount,
    };
  }

  toInvoicePdf(invoice) {
    return new Promise((resolve, reject) => {
      const document = new PDFDocument({ size: 'A4', margin: 46, bufferPages: true });
      const chunks = [];
      document.on('data', (chunk) => chunks.push(chunk));
      document.on('end', () => resolve(Buffer.concat(chunks)));
      document.on('error', reject);

      const pageWidth = document.page.width - document.page.margins.left - document.page.margins.right;
      const columns = [
        { label: 'Date', width: 55 }, { label: 'Company / purpose', width: 151 },
        { label: 'Tier', width: 52 }, { label: 'Time (IST)', width: 76 },
        { label: 'Rate', width: 78 }, { label: 'Amount', width: pageWidth - 412 },
      ];
      const left = document.page.margins.left;
      const drawTableHeader = (top) => {
        document.save().fillColor('#eef6ff').rect(left, top, pageWidth, 23).fill().restore();
        document.font('Helvetica-Bold').fontSize(8).fillColor('#1f2937');
        let x = left;
        for (const column of columns) {
          document.text(column.label, x + 5, top + 7, { width: column.width - 10, lineBreak: false });
          x += column.width;
        }
        return top + 23;
      };

      document.fillColor('#1f2937').font('Helvetica-Bold').fontSize(20).text('AGENT VISIT INVOICE');
      document.moveDown(0.3).font('Helvetica').fontSize(9).fillColor('#5f6368')
        .text(`Invoice: ${invoice.invoiceNumber}`)
        .text(`Billing month: ${invoice.month}    Generated: ${invoice.generatedOn} IST`)
        .moveDown(0.35).fillColor('#1f2937').font('Helvetica-Bold').fontSize(11).text(invoice.agent.fullName)
        .font('Helvetica').fontSize(9).fillColor('#5f6368').text(`Agent ID: ${invoice.agent.id}    ${invoice.agent.email}`)
        .moveDown(0.8);

      let y = drawTableHeader(document.y);
      for (let index = 0; index < invoice.items.length; index += 1) {
        const item = invoice.items[index];
        const description = `${item.companyName}\n${item.purpose}`;
        document.font('Helvetica').fontSize(8);
        const rowHeight = Math.max(31, document.heightOfString(description, { width: columns[1].width - 10 }) + 12);
        if (y + rowHeight > document.page.height - 70) {
          document.addPage();
          y = drawTableHeader(document.page.margins.top);
        }
        if (index % 2 === 1) document.save().fillColor('#fafbfc').rect(left, y, pageWidth, rowHeight).fill().restore();
        document.strokeColor('#e5e7eb').moveTo(left, y + rowHeight).lineTo(left + pageWidth, y + rowHeight).stroke();
        const values = [item.workDate, description, item.category, `${item.checkInTime} - ${item.checkOutTime}`, invoiceAmount(item.rate), invoiceAmount(item.amount)];
        let x = left;
        for (let cell = 0; cell < columns.length; cell += 1) {
          document.font(cell === 1 ? 'Helvetica' : 'Helvetica').fontSize(8).fillColor('#1f2937')
            .text(values[cell], x + 5, y + 6, { width: columns[cell].width - 10, height: rowHeight - 8, ellipsis: true });
          x += columns[cell].width;
        }
        y += rowHeight;
      }

      if (y + 58 > document.page.height - 46) { document.addPage(); y = document.page.margins.top; }
      document.moveTo(left, y + 12).lineTo(left + pageWidth, y + 12).lineWidth(1.2).strokeColor('#2875d1').stroke();
      document.font('Helvetica').fontSize(9).fillColor('#1f2937').text(`Approved visits: ${invoice.totalVisits}`, left, y + 22);
      document.font('Helvetica-Bold').fontSize(13).text(`Total due: ${invoiceAmount(invoice.totalAmount)}`, left, y + 20, { width: pageWidth, align: 'right' });
      document.font('Helvetica').fontSize(8).fillColor('#5f6368').text('Includes approved, non-deleted visits only. No tax added.', left, y + 43, { width: pageWidth });
      document.end();
    });
  }

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
