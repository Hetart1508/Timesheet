import { describe, expect, it, vi } from 'vitest';
import { AdminService } from '../src/modules/admin/admin.service.js';

const submitted = {
  id: 12, agent_id: 4, work_date: '2026-10-17', status: 'SUBMITTED', daily_summary: 'Completed all scheduled customer visits.',
  submitted_at: new Date(), reviewed_at: null, review_comment: null, agent_name: 'Asha Patel', agent_email: 'asha@example.com', agent_username: 'asha',
  visits: [], reviews: [],
};

function repository(overrides = {}) {
  return {
    transaction: (work) => work({}),
    timesheetDetail: vi.fn(async () => submitted),
    review: vi.fn(), audit: vi.fn(), setAgentStatus: vi.fn(async () => ({ id: 4, status: 'ACTIVE' })),
    ...overrides,
  };
}

describe('Admin review workflow', () => {
  it('groups approved hours by Agent and date for the selected month', async () => {
    const rows = [
      { agent_id: 4, agent_name: 'Asha Patel', agent_status: 'ACTIVE', work_date: '2024-02-29', approved_minutes: 150 },
      { agent_id: 7, agent_name: 'Morgan Lee', agent_status: 'INACTIVE', work_date: null, approved_minutes: 0 },
    ];
    const repo = repository({ workCalendar: vi.fn(async () => rows) });

    const result = await new AdminService(repo).workCalendar('2024-02', 4);

    expect(repo.workCalendar).toHaveBeenCalledWith('2024-02-01', '2024-02-29', 4);
    expect(result.agents).toEqual([
      { id: 4, fullName: 'Asha Patel', status: 'ACTIVE', approvedHoursByDate: { '2024-02-29': 2.5 } },
      { id: 7, fullName: 'Morgan Lee', status: 'INACTIVE', approvedHoursByDate: {} },
    ]);
  });

  it('includes visit category in the Admin timesheet detail', async () => {
    const row = {
      ...submitted,
      visits: [{ id: 19, company_id: 5, company_name_snapshot: 'Acme', category: 'Bronze', contact_person: 'Ravi Shah',
        purpose: 'Product demonstration', visit_notes: 'Demonstrated the new workflow.', check_in_at: '2026-10-17 04:30:00',
        check_out_at: '2026-10-17 05:30:00', duration_minutes: 60 }],
      reviews: [],
    };
    const service = new AdminService(repository({ timesheetDetail: vi.fn(async () => row) }));
    const result = await service.timesheet(12);
    expect(result.visits[0].category).toBe('Bronze');
  });

  it('records a review and its audit event in one transaction', async () => {
    const repo = repository(); const service = new AdminService(repo);
    const result = await service.review(12, { id: 1 }, { decision: 'APPROVED', comment: 'Verified.' }, { ip: '127.0.0.1' });
    expect(repo.review).toHaveBeenCalledWith(12, 1, 'APPROVED', 'Verified.', expect.anything());
    expect(repo.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'TIMESHEET_APPROVED', entityType: 'TIMESHEET' }), expect.anything());
    expect(result.agent.fullName).toBe('Asha Patel');
  });

  it('refuses to decide a timesheet that is not submitted', async () => {
    const repo = repository({ timesheetDetail: vi.fn(async () => ({ ...submitted, status: 'DRAFT' })) });
    await expect(new AdminService(repo).review(12, { id: 1 }, { decision: 'APPROVED', comment: '' })).rejects.toMatchObject({ code: 'TIMESHEET_NOT_REVIEWABLE', statusCode: 409 });
    expect(repo.review).not.toHaveBeenCalled();
  });

  it('deactivates an Agent and audits the access change', async () => {
    const repo = repository();
    await new AdminService(repo).setAgentStatus(4, 'INACTIVE', { id: 1 }, { ip: '127.0.0.1' });
    expect(repo.setAgentStatus).toHaveBeenCalledWith(4, 'INACTIVE', expect.anything());
    expect(repo.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'AGENT_STATUS_CHANGED', after: { status: 'INACTIVE' } }), expect.anything());
  });

  it('does not allow a non-Agent account to be changed through Agent administration', async () => {
    const repo = repository({ setAgentStatus: vi.fn(async () => null) });
    await expect(new AdminService(repo).setAgentStatus(1, 'INACTIVE', { id: 1 })).rejects.toMatchObject({ code: 'AGENT_NOT_FOUND', statusCode: 404 });
  });

  it('maps device session details and identifies IPv4 and IPv6 addresses', async () => {
    const repo = repository({ listSessions: vi.fn(async () => ({ rows: [
      { id: 'session-v4', user_id: 4, full_name: 'Asha Patel', email: 'asha@example.com', role: 'AGENT', ip_address: '203.0.113.8', user_agent: 'Browser/1', created_at: 'login', last_used_at: null, expires_at: 'expires', revoked_at: null, session_status: 'ACTIVE' },
      { id: 'session-v6', user_id: 5, full_name: 'Morgan Lee', email: 'morgan@example.com', role: 'ADMIN', ip_address: '2001:db8::8', user_agent: 'Browser/2', created_at: 'login', last_used_at: 'refresh', expires_at: 'expires', revoked_at: null, session_status: 'ACTIVE' },
      { id: 'session-mapped', user_id: 6, full_name: 'Taylor Agent', email: 'taylor@example.com', role: 'AGENT', ip_address: '::ffff:192.0.2.7', user_agent: null, created_at: 'login', last_used_at: null, expires_at: 'expires', revoked_at: 'revoked', session_status: 'REVOKED' },
    ], total: 3 })) });

    const result = await new AdminService(repo).sessions({ search: '', page: 1, pageSize: 10 });

    expect(repo.listSessions).toHaveBeenCalledWith({ search: '', page: 1, pageSize: 10 });
    expect(result.sessions.map(({ ipVersion, status }) => ({ ipVersion, status }))).toEqual([
      { ipVersion: 'IPv4', status: 'ACTIVE' },
      { ipVersion: 'IPv6', status: 'ACTIVE' },
      { ipVersion: 'IPv4', status: 'REVOKED' },
    ]);
    expect(result.sessions.map(({ ipAddress }) => ipAddress)).toEqual([
      '203.0.113.8', '2001:db8::8', '192.0.2.7',
    ]);
    expect(result.pagination).toEqual({ page: 1, pageSize: 10, total: 3 });
  });
});
