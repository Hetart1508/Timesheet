import { describe, expect, it, vi } from 'vitest';
import { AdminRepository } from '../src/modules/admin/admin.repository.js';
import { AgentImportRepository } from '../src/modules/imports/agent-import.repository.js';
import { AuthRepository } from '../src/modules/auth/auth.repository.js';
import { CompanyRepository } from '../src/modules/companies/company.repository.js';
import { ImportRepository } from '../src/modules/imports/import.repository.js';
import { ReportRepository } from '../src/modules/reports/report.repository.js';
import { TimesheetRepository } from '../src/modules/timesheets/timesheet.repository.js';

describe('audit timestamps', () => {
  it('writes every audit event with an explicit UTC timestamp', async () => {
    const connection = { execute: vi.fn().mockResolvedValue([{ insertId: 1 }]) };
    const genericAudit = { actorUserId: 1, action: 'TEST_ACTION', entityType: 'TEST', entityId: 2 };

    await new AdminRepository().audit(genericAudit, connection);
    await new AuthRepository().audit(genericAudit, connection);
    await new TimesheetRepository().audit(genericAudit, connection);
    await new CompanyRepository().audit({ userId: 1, companyId: 2, after: {} }, connection);
    await new AgentImportRepository().auditAgentImport({ actorId: 1, importId: 2, rowCount: 3 }, connection);
    await new ImportRepository().auditImport({ actorId: 1, importId: 2, summary: {} }, connection);
    await new ReportRepository().auditInvoice(1, { agent: { id: 2 }, month: '2026-10', items: [], totalAmount: 0 }, null, connection);
    await new ReportRepository().auditExport(1, 'csv', {}, null, connection);

    expect(connection.execute).toHaveBeenCalledTimes(8);
    for (const [sql] of connection.execute.mock.calls) {
      expect(sql).toContain('created_at');
      expect(sql).toContain('UTC_TIMESTAMP(6)');
    }
  });

  it('writes timesheet reviews with an explicit UTC timestamp in AdminRepository and ImportRepository', async () => {
    const connection = { execute: vi.fn().mockResolvedValue([{ insertId: 1 }]) };
    await new AdminRepository().review(1, 2, 'APPROVED', 'Looks good', connection);
    expect(connection.execute).toHaveBeenCalledTimes(2);
    const [reviewSql] = connection.execute.mock.calls[0];
    expect(reviewSql).toContain('INSERT INTO timesheet_reviews');
    expect(reviewSql).toContain('created_at');
    expect(reviewSql).toContain('UTC_TIMESTAMP(6)');

    const importConnection = { execute: vi.fn().mockResolvedValue([{ insertId: 1 }]) };
    await new ImportRepository().createTimesheet({ agentId: 1, workDate: '2026-10-20', status: 'APPROVED' }, 2, importConnection);
    expect(importConnection.execute).toHaveBeenCalledTimes(2);
    const [, [importReviewSql]] = importConnection.execute.mock.calls;
    expect(importReviewSql).toContain('INSERT INTO timesheet_reviews');
    expect(importReviewSql).toContain('created_at');
    expect(importReviewSql).toContain('UTC_TIMESTAMP(6)');
  });
});
