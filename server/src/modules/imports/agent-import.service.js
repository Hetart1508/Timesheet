import crypto from 'node:crypto';
import ExcelJS from 'exceljs';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';
import { hashToken, randomToken } from '../../utils/crypto.js';
import { normalizeEmail, normalizeName } from '../../utils/normalize.js';

const headers = ['Full Name', 'Email'];
const headerKeys = Object.fromEntries(headers.map((header) => [header.toLowerCase().replace(/[^a-z]/g, ''), header]));
const inviteTtlMs = 7 * 24 * 60 * 60 * 1000;
const cellText = (value) => {
  if (value == null) return '';
  if (typeof value === 'object') {
    if (value.result != null) return cellText(value.result);
    if (value.text != null) return String(value.text).trim();
    if (Array.isArray(value.richText)) return value.richText.map((part) => part.text).join('').trim();
  }
  return String(value).trim();
};

export class AgentImportService {
  constructor(repository, emailService, options = {}) {
    this.repository = repository;
    this.emailService = emailService;
    this.appBaseUrl = options.appBaseUrl || env.APP_BASE_URL;
    this.tokenFactory = options.tokenFactory || (() => randomToken(48));
    this.now = options.now || (() => Date.now());
  }

  async template() {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Timesheet Management';
    const instructions = workbook.addWorksheet('Instructions');
    instructions.addRows([
      ['Agent invitation import'],
      ['Use one row per Agent. Each valid email receives a one-time account setup link.'],
      ['Required columns', 'Full Name, Email'],
      ['Invitation link', 'Valid for 7 days. Agents use it to choose a password.'],
      ['Existing accounts', 'Emails already in the system cannot be imported again.'],
    ]);
    instructions.getColumn(1).width = 24;
    instructions.getColumn(2).width = 80;
    instructions.getRow(1).font = { bold: true, size: 16 };
    const sheet = workbook.addWorksheet('Agents', { views: [{ state: 'frozen', ySplit: 1 }] });
    sheet.addRow(headers);
    sheet.addRow(['Asha Patel', 'asha@example.com']);
    sheet.columns = [{ width: 32 }, { width: 38 }];
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2875D1' } };
    return workbook.xlsx.writeBuffer();
  }

  async parse(buffer) {
    if (!Buffer.isBuffer(buffer) || !buffer.length) throw new AppError(400, 'IMPORT_FILE_REQUIRED', 'Choose a non-empty .xlsx file');
    let workbook;
    try { workbook = new ExcelJS.Workbook(); await workbook.xlsx.load(buffer); } catch { throw new AppError(422, 'INVALID_EXCEL_FILE', 'The selected file is not a valid .xlsx workbook'); }
    const sheet = workbook.getWorksheet('Agents') || workbook.worksheets[0];
    if (!sheet) throw new AppError(422, 'EMPTY_WORKBOOK', 'The workbook does not contain a worksheet');
    const columnMap = {};
    sheet.getRow(1).eachCell((cell, column) => {
      const key = cellText(cell.value).toLowerCase().replace(/[^a-z]/g, '');
      if (headerKeys[key]) columnMap[headerKeys[key]] = column;
    });
    const missing = headers.filter((header) => !columnMap[header]);
    if (missing.length) throw new AppError(422, 'IMPORT_HEADERS_MISSING', `Missing required columns: ${missing.join(', ')}`);

    const rows = [];
    for (let rowNumber = 2; rowNumber <= sheet.actualRowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      const fullName = normalizeName(cellText(row.getCell(columnMap['Full Name']).value));
      const email = normalizeEmail(cellText(row.getCell(columnMap.Email).value));
      if (!fullName && !email) continue;
      const errors = [];
      if (fullName.length < 2 || fullName.length > 120) errors.push('Full Name must contain 2 to 120 characters.');
      if (email.length > 254 || !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email is invalid.');
      rows.push({ rowNumber, fullName, email, errors });
      if (rows.length > 2000) throw new AppError(413, 'IMPORT_TOO_MANY_ROWS', 'A maximum of 2,000 Agent rows can be imported at once');
    }
    if (!rows.length) throw new AppError(422, 'IMPORT_EMPTY', 'The worksheet does not contain any Agent rows');

    const emailRows = new Map();
    for (const row of rows) {
      if (!row.email) continue;
      const matchingRows = emailRows.get(row.email) || [];
      matchingRows.push(row);
      emailRows.set(row.email, matchingRows);
    }
    for (const matchingRows of emailRows.values()) {
      if (matchingRows.length > 1) for (const row of matchingRows) row.errors.push('Email appears more than once in this workbook.');
    }
    return rows;
  }

  async validate(buffer) {
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');
    const rows = await this.parse(buffer);
    const emails = [...new Set(rows.map((row) => row.email).filter(Boolean))];
    const [existingUsers, existingInvitations, previousImport] = await Promise.all([
      this.repository.findUsersByEmails(emails),
      this.repository.findOpenAgentInvitationsByEmails(emails),
      this.repository.findAgentImportByHash(hash),
    ]);
    const existingEmails = new Set(existingUsers.map((user) => user.email_normalized));
    const invitedEmails = new Set(existingInvitations.map((invitation) => invitation.email_normalized));
    for (const row of rows) {
      if (existingEmails.has(row.email)) row.errors.push('An account already uses this email.');
      else if (invitedEmails.has(row.email)) row.errors.push('An invitation already exists for this email. Resend it from the invitation list.');
      if (previousImport) row.errors.push(`This exact file was already imported as #${previousImport.id}.`);
    }
    const errorRows = rows.filter((row) => row.errors.length).length;
    return { hash, rows, summary: { totalRows: rows.length, validRows: rows.length - errorRows, errorRows } };
  }

  publicPreview(result) {
    return { summary: result.summary, rows: result.rows.map(({ rowNumber, fullName, email, errors }) => ({ rowNumber, fullName, email, errors })) };
  }

  async preview(buffer) { return this.publicPreview(await this.validate(buffer)); }

  async commit(buffer, fileName, actor, request = {}) {
    const validation = await this.validate(buffer);
    if (validation.summary.errorRows) throw new AppError(422, 'IMPORT_VALIDATION_FAILED', `Resolve all ${validation.summary.errorRows} invalid rows before importing`);
    const rawInvites = validation.rows.map((row) => ({
      ...row,
      token: this.tokenFactory(),
      tokenHash: '',
      expiresAt: new Date(this.now() + inviteTtlMs),
    }));
    for (const invite of rawInvites) invite.tokenHash = hashToken(invite.token);

    const importId = await this.repository.transaction(async (connection) => {
      if (await this.repository.findAgentImportByHash(validation.hash, connection)) {
        throw new AppError(409, 'IMPORT_ALREADY_COMPLETED', 'This exact file has already been imported');
      }
      const id = await this.repository.createAgentImport({
        actorId: actor.id, fileName, hash: validation.hash, rowCount: rawInvites.length,
      }, connection);
      for (const invite of rawInvites) {
        invite.id = await this.repository.createAgentInvitation({ ...invite, importId: id, actorId: actor.id }, connection);
      }
      await this.repository.auditAgentImport({ actorId: actor.id, importId: id, rowCount: rawInvites.length, ipAddress: request.ip }, connection);
      return id;
    });

    const results = [];
    for (let offset = 0; offset < rawInvites.length; offset += 5) {
      const batch = await Promise.all(rawInvites.slice(offset, offset + 5).map(async (invite) => {
        let delivered = false;
        try {
          const result = await this.emailService.sendAgentInvitation(
            { id: invite.id, fullName: invite.fullName, email: invite.email },
            `${this.appBaseUrl}/accept-invitation?token=${encodeURIComponent(invite.token)}`,
          );
          delivered = Boolean(result?.delivered);
        } catch { delivered = false; }
        await this.repository.setAgentInvitationDelivery(invite.id, delivered ? 'SENT' : 'FAILED');
        return { id: invite.id, fullName: invite.fullName, email: invite.email, status: delivered ? 'SENT' : 'FAILED' };
      }));
      results.push(...batch);
    }
    const sentCount = results.filter((item) => item.status === 'SENT').length;
    return { importId, totalRows: results.length, sentCount, failedCount: results.length - sentCount, rows: results };
  }

  async invitations() {
    return (await this.repository.listOpenAgentInvitations()).map((row) => ({
      id: Number(row.id), fullName: row.full_name, email: row.email, status: row.status, expiresAt: row.expires_at,
    }));
  }

  async resend(invitationId) {
    const invitation = await this.repository.findOpenAgentInvitation(invitationId);
    if (!invitation) throw new AppError(404, 'AGENT_INVITATION_NOT_FOUND', 'This pending Agent invitation was not found');
    const token = this.tokenFactory();
    const expiresAt = new Date(this.now() + inviteTtlMs);
    await this.repository.replaceAgentInvitationToken(invitation.id, hashToken(token), expiresAt);
    let delivered = false;
    try {
      const result = await this.emailService.sendAgentInvitation(
        { id: invitation.id, fullName: invitation.full_name, email: invitation.email },
        `${this.appBaseUrl}/accept-invitation?token=${encodeURIComponent(token)}`,
      );
      delivered = Boolean(result?.delivered);
    } catch { delivered = false; }
    await this.repository.setAgentInvitationDelivery(invitation.id, delivered ? 'SENT' : 'FAILED');
    return { id: Number(invitation.id), status: delivered ? 'SENT' : 'FAILED' };
  }
}