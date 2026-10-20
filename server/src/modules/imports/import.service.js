import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { AppError } from '../../utils/app-error.js';
import { currentBusinessDate, istLocalToUtc, validateBusinessDate } from '../../utils/business-time.js';
import { normalizeEmail, normalizeName } from '../../utils/normalize.js';

const headers = ['Agent Email', 'Work Date', 'Daily Summary', 'Status', 'Company Name', 'Company Address', 'Category', 'Contact Person', 'Purpose', 'Visit Notes', 'Check In', 'Check Out'];
const headerKeys = Object.fromEntries(headers.map((header) => [header.toLowerCase().replace(/[^a-z]/g, ''), header]));
const statuses = new Set(['DRAFT', 'SUBMITTED', 'APPROVED']);
const categories = new Set(['Gold', 'Silver', 'Bronze']);
const text = (value) => {
  if (value == null) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (value.result != null) return text(value.result);
    if (value.text != null) return String(value.text).trim();
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim();
  }
  return String(value).trim();
};
const excelDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = text(value);
  let match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  return match ? raw : '';
};
const excelTime = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return `${String(value.getUTCHours()).padStart(2, '0')}:${String(value.getUTCMinutes()).padStart(2, '0')}`;
  if (typeof value === 'number' && value >= 0 && value < 1) { const minutes = Math.round(value * 1440) % 1440; return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`; }
  const raw = String(text(value)).toUpperCase();
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/.exec(raw);
  if (!match) return '';
  let hour = Number(match[1]); const minute = Number(match[2]);
  if (minute > 59 || hour > (match[3] ? 12 : 23) || hour < (match[3] ? 1 : 0)) return '';
  if (match[3] === 'AM' && hour === 12) hour = 0;
  if (match[3] === 'PM' && hour !== 12) hour += 12;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
};
const safeName = (value) => normalizeName(String(value || '')).slice(0, 180);
const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

export class ImportService {
  constructor(repository) { this.repository = repository; }

  async template() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Timesheet Management';
    const instructions = workbook.addWorksheet('Instructions');
    instructions.addRows([
      ['Timesheet visit import'],
      ['Use one row per company visit. Rows with the same Agent Email and Work Date become one timesheet.'],
      ['Dates', 'DD/MM/YYYY'], ['Times', '24-hour HH:mm or Excel time'], ['Allowed statuses', 'DRAFT, SUBMITTED, APPROVED'], ['Allowed categories', 'Gold, Silver, Bronze'],
      ['Agents', 'The Agent Email must already exist in the system.'], ['Companies', 'A missing company will be created only when Company Address is supplied.'],
    ]);
    instructions.getColumn(1).width = 24; instructions.getColumn(2).width = 80; instructions.getRow(1).font = { bold: true, size: 16 };
    const sheet = workbook.addWorksheet('Timesheet Visits', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.addRow(headers);
    sheet.addRow(['agent@example.com', '19/10/2026', 'Completed planned field visits.', 'DRAFT', 'Example Company', 'Example address', 'Silver', 'Contact Name', 'Product discussion', 'Replace or delete this example row.', '10:00', '11:00']);
    sheet.columns = [28, 16, 35, 15, 26, 35, 14, 24, 32, 40, 14, 14].map((width) => ({ width }));
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }; sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2875D1' } };
    sheet.getColumn(2).numFmt = 'dd/mm/yyyy';
    sheet.dataValidations.add('D2:D2001', { type: 'list', allowBlank: false, formulae: ['"DRAFT,SUBMITTED,APPROVED"'] });
    sheet.dataValidations.add('G2:G2001', { type: 'list', allowBlank: false, formulae: ['"Gold,Silver,Bronze"'] });
    return workbook.xlsx.writeBuffer();
  }

  async parse(buffer) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new AppError(400, 'IMPORT_FILE_REQUIRED', 'Choose a non-empty .xlsx file');
    let workbook;
    try { workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer); } catch { throw new AppError(422, 'INVALID_EXCEL_FILE', 'The selected file is not a valid .xlsx workbook'); }
    const sheet = workbook.getWorksheet('Timesheet Visits') || workbook.worksheets[0];
    if (!sheet) throw new AppError(422, 'EMPTY_WORKBOOK', 'The workbook does not contain a worksheet');
    const columnMap = {};
    sheet.getRow(1).eachCell((cell, column) => { const key = String(text(cell.value)).toLowerCase().replace(/[^a-z]/g, ''); if (headerKeys[key]) columnMap[headerKeys[key]] = column; });
    const missing = headers.filter((header) => !columnMap[header]);
    if (missing.length) throw new AppError(422, 'IMPORT_HEADERS_MISSING', `Missing required columns: ${missing.join(', ')}`);
    const rows = [];
    for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const get = (header) => row.getCell(columnMap[header]).value;
      if (headers.every((header) => text(get(header)) === '')) continue;
      const rawStatus = String(text(get('Status')) || 'DRAFT').toUpperCase();
      const rawCategory = String(text(get('Category')) || 'Silver').toLowerCase();
      const category = `${rawCategory.slice(0, 1).toUpperCase()}${rawCategory.slice(1)}`;
      const workDate = excelDate(get('Work Date')); const checkIn = excelTime(get('Check In')); const checkOut = excelTime(get('Check Out'));
      const rowData = { rowNumber, agentEmail: normalizeEmail(String(text(get('Agent Email')))), workDate, dailySummary: String(text(get('Daily Summary'))), status: rawStatus,
        companyName: safeName(text(get('Company Name'))), companyAddress: String(text(get('Company Address'))), category, contactPerson: String(text(get('Contact Person'))), purpose: String(text(get('Purpose'))), visitNotes: String(text(get('Visit Notes'))), checkIn, checkOut, errors: [] };
      if (!/^\S+@\S+\.\S+$/.test(rowData.agentEmail)) rowData.errors.push('Agent Email is invalid.');
      try { validateBusinessDate(workDate); } catch { rowData.errors.push('Work Date must use DD/MM/YYYY.'); }
      if (workDate && workDate > currentBusinessDate()) rowData.errors.push('Work Date cannot be in the future.');
      if (!statuses.has(rawStatus)) rowData.errors.push('Status must be DRAFT, SUBMITTED, or APPROVED.');
      if (!rowData.companyName) rowData.errors.push('Company Name is required.');
      if (!categories.has(category)) rowData.errors.push('Category must be Gold, Silver, or Bronze.');
      if (!rowData.contactPerson) rowData.errors.push('Contact Person is required.');
      if (!rowData.purpose) rowData.errors.push('Purpose is required.');
      if (!rowData.visitNotes) rowData.errors.push('Visit Notes are required.');
      if (!checkIn || !checkOut) rowData.errors.push('Check In and Check Out must use HH:mm.');
      if (workDate && checkIn && checkOut) { rowData.checkInAt = istLocalToUtc(workDate, checkIn); rowData.checkOutAt = istLocalToUtc(workDate, checkOut); if (rowData.checkOutAt <= rowData.checkInAt) rowData.errors.push('Check Out must be after Check In.'); }
      if (rowData.dailySummary.length > 5000 || rowData.companyAddress.length > 500 || rowData.contactPerson.length > 120 || rowData.purpose.length > 500 || rowData.visitNotes.length > 10000) rowData.errors.push('One or more text values exceed the allowed length.');
      rows.push(rowData);
      if (rows.length > 2000) throw new AppError(413, 'IMPORT_TOO_MANY_ROWS', 'A maximum of 2,000 visit rows can be imported at once');
    }
    if (!rows.length) throw new AppError(422, 'IMPORT_EMPTY', 'The worksheet does not contain any data rows');
    return rows;
  }

  async validate(buffer) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const rows = await this.parse(buffer);
    const emails = [...new Set(rows.map((row) => row.agentEmail).filter(Boolean))];
    const names = [...new Set(rows.map((row) => row.companyName.toLowerCase()).filter(Boolean))];
    const [agents, companies, previousImport] = await Promise.all([this.repository.findAgentsByEmails(emails), this.repository.findCompaniesByNames(names), this.repository.findImportByHash(hash)]);
    const agentMap = new Map(agents.map((agent) => [agent.email_normalized, agent]));
    const companyMap = new Map();
    for (const company of companies) if (!companyMap.has(company.company_name_normalized)) companyMap.set(company.company_name_normalized, company);
    for (const row of rows) {
      const agent = agentMap.get(row.agentEmail); row.agentId = agent ? Number(agent.id) : null;
      if (!agent) row.errors.push('No Agent account matches this email.'); else if (agent.status !== 'ACTIVE') row.errors.push('The matched Agent account is inactive.');
      row.companyNormalized = row.companyName.toLowerCase(); const company = companyMap.get(row.companyNormalized); row.companyId = company ? Number(company.id) : null;
      if (company && company.status !== 'ACTIVE') row.errors.push('The matched company is inactive.');
      if (!company && !row.companyAddress) row.errors.push('Company Address is required when creating a new company.');
    }
    const groups = new Map();
    for (const row of rows) {
      if (!row.agentId || !row.workDate) continue;
      const key = `${row.agentId}:${row.workDate}`;
      if (!groups.has(key)) groups.set(key, { key, agentId: row.agentId, agentEmail: row.agentEmail, workDate: row.workDate, dailySummary: row.dailySummary, status: row.status, rows: [] });
      const group = groups.get(key); group.rows.push(row);
      if (group.status !== row.status) row.errors.push('Status must be identical for every row in the same timesheet.');
      if (group.dailySummary !== row.dailySummary) row.errors.push('Daily Summary must be identical for every row in the same timesheet.');
    }
    const existing = await this.repository.findTimesheetsByAgentDates([...groups.values()]);
    const existingKeys = new Set(existing.map((item) => `${Number(item.agent_id)}:${dateOnly(item.work_date)}`));
    for (const group of groups.values()) {
      if (existingKeys.has(group.key)) for (const row of group.rows) row.errors.push('A timesheet already exists for this Agent and Work Date.');
      const timed = group.rows.filter((row) => row.checkInAt && row.checkOutAt).sort((a, b) => a.checkInAt - b.checkInAt);
      for (let index = 1; index < timed.length; index += 1) if (timed[index].checkInAt < timed[index - 1].checkOutAt) { timed[index - 1].errors.push(`Visit overlaps row ${timed[index].rowNumber}.`); timed[index].errors.push(`Visit overlaps row ${timed[index - 1].rowNumber}.`); }
    }
    if (previousImport) for (const row of rows) row.errors.push(`This exact file was already imported as #${previousImport.id}.`);
    const errorRows = rows.filter((row) => row.errors.length).length;
    const companiesToCreate = new Set(rows.filter((row) => !row.companyId && row.companyName).map((row) => row.companyNormalized)).size;
    return { hash, rows, groups: [...groups.values()], summary: { totalRows: rows.length, validRows: rows.length - errorRows, errorRows, timesheets: groups.size, companiesToCreate }, previousImport };
  }

  publicPreview(result) {
    return { summary: result.summary, rows: result.rows.map(({ rowNumber, agentEmail, workDate, companyName, status, errors }) => ({ rowNumber, agentEmail, workDate, companyName, status, errors })) };
  }

  async preview(buffer) { return this.publicPreview(await this.validate(buffer)); }

  async commit(buffer, fileName, actor, request = {}) {
    const validation = await this.validate(buffer);
    if (validation.summary.errorRows) throw new AppError(422, 'IMPORT_VALIDATION_FAILED', `Resolve all ${validation.summary.errorRows} invalid rows before importing`);
    const result = await this.repository.transaction(async (connection) => {
      if (await this.repository.findImportByHash(validation.hash, connection)) throw new AppError(409, 'IMPORT_ALREADY_COMPLETED', 'This exact file has already been imported');
      const companyIds = new Map(); let companyCount = 0;
      for (const row of validation.rows) {
        if (companyIds.has(row.companyNormalized)) continue;
        if (row.companyId) companyIds.set(row.companyNormalized, row.companyId);
        else { companyIds.set(row.companyNormalized, await this.repository.createCompany(row, actor.id, connection)); companyCount += 1; }
      }
      for (const group of validation.groups) {
        const timesheetId = await this.repository.createTimesheet(group, actor.id, connection);
        for (const row of group.rows) await this.repository.createVisit(timesheetId, row, companyIds.get(row.companyNormalized), actor.id, connection);
      }
      const summary = { ...validation.summary, companyCount, visitCount: validation.rows.length, timesheetCount: validation.groups.length };
      const importId = await this.repository.recordImport({ actorId: actor.id, fileName, hash: validation.hash, rowCount: validation.rows.length, timesheetCount: validation.groups.length, visitCount: validation.rows.length, companyCount }, connection);
      await this.repository.auditImport({ actorId: actor.id, importId, summary, ipAddress: request.ip }, connection);
      return { importId, ...summary };
    });
    return result;
  }

  async history() {
    const rows = await this.repository.history();
    return rows.map((row) => ({ id: Number(row.id), fileName: row.file_name, rowCount: Number(row.row_count), timesheetCount: Number(row.timesheet_count), visitCount: Number(row.visit_count), companyCount: Number(row.company_count), importedBy: row.imported_by_name, createdAt: row.created_at }));
  }
}
