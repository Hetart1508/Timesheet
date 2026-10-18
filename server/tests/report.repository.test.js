import { describe, expect, it, vi } from 'vitest';
import { ReportRepository } from '../src/modules/reports/report.repository.js';

describe('monthly invoice repository query', () => {
  it('limits invoice rows to approved, active visits in the selected month', async () => {
    const rows = [{ visit_id: 12, category: 'Gold' }];
    const connection = { execute: vi.fn(async () => [rows, []]) };
    const result = await new ReportRepository().invoiceRows(7, '2026-09', connection);
    const [query, values] = connection.execute.mock.calls[0];

    expect(query).toContain("t.status = 'APPROVED'");
    expect(query).toContain('v.deleted_at IS NULL');
    expect(query).toContain('t.work_date >= ?');
    expect(query).toContain('t.work_date < DATE_ADD(?, INTERVAL 1 MONTH)');
    expect(values).toEqual([7, '2026-09-01', '2026-09-01']);
    expect(result).toBe(rows);
  });
});