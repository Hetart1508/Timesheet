import { describe, expect, it, vi } from 'vitest';
import { ConfirmationService } from '../src/modules/confirmations/confirmation.service.js';

const request = (overrides = {}) => ({
  id: 9, timesheet_id: 12, requested_by: 1, agent_name: 'Asha Patel', work_date: '2026-11-01',
  daily_summary: 'Completed all scheduled customer visits.', status: 'SUBMITTED', response: null, responded_at: null,
  expires_at: new Date(Date.now() + 60_000),
  visits: [{ company_name: 'Acme', category: 'Gold', mdr: 'Level 1', contact_person: 'Ravi', purpose: 'Demo', visit_notes: 'Demonstrated product.', duration_minutes: 60 }],
  ...overrides,
});

describe('Agent timesheet confirmation', () => {
  it('shows the summary and visits without requiring an Agent account', async () => {
    const repository = { find: vi.fn(async () => request()) };
    const result = await new ConfirmationService(repository).get('a'.repeat(32));
    expect(result).toMatchObject({ agentName: 'Asha Patel', visitCount: 1, durationMinutes: 60, expired: false });
    expect(result.visits[0]).toMatchObject({ companyName: 'Acme', category: 'Gold' });
  });

  it('records a one-time Yes response', async () => {
    const repository = {
      transaction: (work) => work({}),
      find: vi.fn(async () => request()),
      respond: vi.fn(async () => 'APPROVED'),
    };
    await expect(new ConfirmationService(repository).respond('a'.repeat(32), 'YES')).resolves.toEqual({ status: 'APPROVED', response: 'YES' });
    expect(repository.respond).toHaveBeenCalledWith(expect.objectContaining({ timesheet_id: 12 }), 'YES', expect.anything());
  });

  it('rejects an old link after the Admin edits the timesheet', async () => {
    const repository = { transaction: (work) => work({}), find: vi.fn(async () => request({ status: 'DRAFT' })), respond: vi.fn() };
    await expect(new ConfirmationService(repository).respond('a'.repeat(32), 'NO')).rejects.toMatchObject({ code: 'TIMESHEET_ALREADY_CHANGED', statusCode: 409 });
    expect(repository.respond).not.toHaveBeenCalled();
  });
});
