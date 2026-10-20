import ExcelJS from 'exceljs';
import { describe, expect, it, vi } from 'vitest';
import { AgentImportService } from '../src/modules/imports/agent-import.service.js';
import { hashToken } from '../src/utils/crypto.js';

const makeWorkbook = async (rows, headers = ['Full Name', 'Email']) => {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Agents');
  sheet.addRow(headers);
  rows.forEach((row) => sheet.addRow(row));
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

class FakeAgentImportRepository {
  constructor() { this.users = []; this.invitations = []; this.imports = []; this.audits = []; }
  transaction(work) { return work(this); }
  findUsersByEmails(emails) { return this.users.filter((item) => emails.includes(item.email_normalized)); }
  findOpenAgentInvitationsByEmails(emails) { return this.invitations.filter((item) => emails.includes(item.email_normalized) && item.status !== 'ACCEPTED'); }
  findAgentImportByHash(hash) { return this.imports.find((item) => item.hash === hash) || null; }
  createAgentImport(data) { const id = this.imports.length + 1; this.imports.push({ id, ...data, hash: data.hash }); return id; }
  createAgentInvitation(data) { const id = this.invitations.length + 1; this.invitations.push({ id, ...data, status: 'PENDING', email_normalized: data.email }); return id; }
  auditAgentImport(data) { this.audits.push(data); }
  setAgentInvitationDelivery(id, status) { this.invitations.find((item) => item.id === id).status = status; }
  listOpenAgentInvitations() { return this.invitations.filter((item) => item.status !== 'ACCEPTED'); }
  findOpenAgentInvitation(id) { return this.invitations.find((item) => item.id === Number(id) && item.status !== 'ACCEPTED') || null; }
  replaceAgentInvitationToken(id, tokenHash, expiresAt) { Object.assign(this.findOpenAgentInvitation(id), { tokenHash, expiresAt }); }
}

describe('AgentImportService', () => {
  it('parses the template columns and normalizes names and email addresses', async () => {
    const repository = new FakeAgentImportRepository();
    const service = new AgentImportService(repository, {}, { appBaseUrl: 'https://app.example.com' });
    const workbook = await makeWorkbook([['  Asha   Patel ', ' ASHA@EXAMPLE.COM ']]);

    await expect(service.preview(workbook)).resolves.toMatchObject({
      summary: { totalRows: 1, validRows: 1, errorRows: 0 },
      rows: [{ fullName: 'Asha Patel', email: 'asha@example.com', errors: [] }],
    });
  });

  it('rejects duplicate, malformed, or already-used email addresses in preview', async () => {
    const repository = new FakeAgentImportRepository();
    repository.users.push({ email_normalized: 'taken@example.com' });
    const service = new AgentImportService(repository, {});
    const workbook = await makeWorkbook([
      ['Asha Patel', 'duplicate@example.com'],
      ['Other Agent', 'DUPLICATE@example.com'],
      ['Existing Agent', 'taken@example.com'],
      ['Bad Email', 'not-an-email'],
    ]);

    const preview = await service.preview(workbook);
    expect(preview.summary).toMatchObject({ totalRows: 4, validRows: 0, errorRows: 4 });
    expect(preview.rows[0].errors).toContain('Email appears more than once in this workbook.');
    expect(preview.rows[2].errors).toContain('An account already uses this email.');
    expect(preview.rows[3].errors).toContain('Email is invalid.');
  });

  it('stores invitations before emailing and returns delivery status per Agent', async () => {
    const repository = new FakeAgentImportRepository();
    const emailService = { sendAgentInvitation: vi.fn(async () => ({ delivered: true })) };
    const service = new AgentImportService(repository, emailService, {
      appBaseUrl: 'https://app.example.com', tokenFactory: () => 'one-time-token', now: () => 1_000,
    });
    const workbook = await makeWorkbook([['Asha Patel', 'asha@example.com']]);

    const result = await service.commit(workbook, 'agents.xlsx', { id: 9 }, { ip: '127.0.0.1' });

    expect(result).toMatchObject({ importId: 1, totalRows: 1, sentCount: 1, failedCount: 0, rows: [{ status: 'SENT' }] });
    expect(repository.invitations[0]).toMatchObject({ status: 'SENT', tokenHash: expect.any(String) });
    expect(repository.audits).toHaveLength(1);
    expect(emailService.sendAgentInvitation).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'asha@example.com' }),
      expect.stringMatching(/^https:\/\/app\.example\.com\/accept-invitation\?token=/),
    );
    await expect(service.commit(workbook, 'agents.xlsx', { id: 9 })).rejects.toMatchObject({ code: 'IMPORT_VALIDATION_FAILED' });
  });

  it('returns a downloadable Excel template', async () => {
    const service = new AgentImportService(new FakeAgentImportRepository(), {});
    const buffer = await service.template();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.getWorksheet('Agents').getRow(1).values).toEqual([, 'Full Name', 'Email']);
  });

  it('resends an invitation with a newly hashed token and fresh expiry', async () => {
    const repository = new FakeAgentImportRepository();
    repository.invitations.push({
      id: 1, full_name: 'Asha Patel', email: 'asha@example.com', email_normalized: 'asha@example.com',
      status: 'FAILED', tokenHash: 'old-hash', expiresAt: new Date(0),
    });
    const emailService = { sendAgentInvitation: vi.fn(async () => ({ delivered: true })) };
    const service = new AgentImportService(repository, emailService, {
      appBaseUrl: 'https://app.example.com', tokenFactory: () => 'replacement-token', now: () => 10_000,
    });

    await expect(service.resend(1)).resolves.toEqual({ id: 1, status: 'SENT' });

    expect(repository.invitations[0]).toMatchObject({ tokenHash: hashToken('replacement-token'), status: 'SENT' });
    expect(repository.invitations[0].expiresAt.getTime()).toBeGreaterThan(10_000);
  });
});