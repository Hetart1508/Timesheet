import { describe, expect, it, vi } from 'vitest';
import { TimesheetRepository } from '../src/modules/timesheets/timesheet.repository.js';

describe('Agent timesheet history repository', () => {
  it('keeps history scoped to the Agent while searching, sorting, and paging', async () => {
    const connection = { execute: vi.fn()
      .mockResolvedValueOnce([[{ id: 7, work_date: '2026-10-17' }], []])
      .mockResolvedValueOnce([[{ total: 12 }], []]) };

    const result = await new TimesheetRepository().list(3, {
      search: 'Acme', status: 'APPROVED', startDate: '2026-10-01', endDate: '2026-10-20',
      sortBy: 'duration', sortOrder: 'asc', page: 2, pageSize: 10,
    }, connection);

    const [listQuery, listValues] = connection.execute.mock.calls[0];
    const [countQuery, countValues] = connection.execute.mock.calls[1];
    expect(listQuery).toContain('t.agent_id = ?');
    expect(listQuery).toContain('EXISTS (SELECT 1 FROM visits');
    expect(listQuery).toContain('ORDER BY duration_minutes ASC');
    expect(listValues).toEqual([3, '2026-10-01', '2026-10-20', 'APPROVED', ...Array(8).fill('%Acme%'), 10, 10]);
    expect(countQuery).toContain('t.agent_id = ?');
    expect(countValues).toEqual(listValues.slice(0, -2));
    expect(result.total).toBe(12);
  });
});
