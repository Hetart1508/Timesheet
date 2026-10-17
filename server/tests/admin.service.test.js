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
});
