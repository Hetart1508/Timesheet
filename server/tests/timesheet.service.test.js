import { describe, expect, it, vi } from 'vitest';
import { TimesheetService } from '../src/modules/timesheets/timesheet.service.js';
import { companyListSchema, historySchema, visitSchema } from '../src/modules/timesheets/timesheet.schemas.js';

function makeRepository(overrides = {}) {
  return {
    transaction: (work) => work({}),
    findOwned: vi.fn(async () => ({ id: 7, agent_id: 3, work_date: '2026-10-17', status: 'DRAFT', daily_summary: 'A complete daily declaration.' })),
    findOwnedVisit: vi.fn(),
    getCompany: vi.fn(async () => ({ id: 5, company_name: 'Acme', status: 'ACTIVE' })),
    overlappingVisit: vi.fn(async () => null),
    createVisit: vi.fn(async () => 11),
    updateVisit: vi.fn(),
    updateSummary: vi.fn(),
    reopenAfterEdit: vi.fn(),
    audit: vi.fn(),
    submissionFacts: vi.fn(async () => ({ visitCount: 1 })),
    submit: vi.fn(),
    adminRecipients: vi.fn(async () => []),
    detail: vi.fn(async () => ({
      id: 7, work_date: '2026-10-17', status: 'DRAFT', daily_summary: 'A complete daily declaration.',
      submitted_at: null, reviewed_at: null, review_comment: null, visits: [], reviews: [],
    })),
    ...overrides,
  };
}

const visit = {
  companyId: 5, category: 'Gold', contactPerson: 'Ravi Shah', purpose: 'Product demonstration',
  visitNotes: 'Demonstrated the new workflow.', checkInTime: '10:00', checkOutTime: '11:00',
};

describe('Agent timesheet business rules', () => {
  it('defaults timesheet and company lists to 10 rows per page', () => {
    expect(historySchema.parse({ body: {}, params: {}, query: {} }).query).toMatchObject({ page: 1, pageSize: 10 });
    expect(companyListSchema.parse({ body: {}, params: {}, query: {} }).query).toMatchObject({ page: 1, pageSize: 10 });
  });

  it('accepts only Gold, Silver, or Bronze visit categories', () => {
    for (const category of ['Gold', 'Silver', 'Bronze']) {
      expect(visitSchema.shape.body.safeParse({ ...visit, category }).success).toBe(true);
    }
    expect(visitSchema.shape.body.safeParse({ ...visit, category: 'Platinum' }).success).toBe(false);
    expect(visitSchema.shape.body.safeParse({ ...visit, category: undefined }).success).toBe(false);
  });

  it('includes visit category in timesheet detail responses', () => {
    const repository = makeRepository();
    const service = new TimesheetService(repository, {});
    const result = service.mapDetail({
      id: 7, work_date: '2026-10-17', status: 'DRAFT', daily_summary: '', visits: [{
        id: 11, company_id: 5, company_name_snapshot: 'Acme', category: 'Gold', contact_person: 'Ravi Shah',
        purpose: 'Product demonstration', visit_notes: 'Demonstrated the new workflow.',
        check_in_at: '2026-10-17 04:30:00', check_out_at: '2026-10-17 05:30:00', duration_minutes: 60,
      }], reviews: [],
    });
    expect(result.visits[0].category).toBe('Gold');
  });

  it('rejects a visit whose check-out is not later than check-in', async () => {
    const repository = makeRepository();
    const service = new TimesheetService(repository, { sendTimesheetSubmitted: vi.fn() });
    await expect(service.addVisit(7, 3, { ...visit, checkOutTime: '09:59' })).rejects.toMatchObject({
      statusCode: 422, code: 'INVALID_VISIT_DURATION',
    });
    expect(repository.createVisit).not.toHaveBeenCalled();
  });

  it('rejects an overlapping visit and does not write it', async () => {
    const repository = makeRepository({ overlappingVisit: vi.fn(async () => ({ id: 2 })) });
    const service = new TimesheetService(repository, { sendTimesheetSubmitted: vi.fn() });
    await expect(service.addVisit(7, 3, visit)).rejects.toMatchObject({ statusCode: 409, code: 'VISIT_OVERLAP' });
    expect(repository.createVisit).not.toHaveBeenCalled();
  });

  it('does not expose a timesheet owned by another Agent', async () => {
    const repository = makeRepository({ detail: vi.fn(async () => null) });
    const service = new TimesheetService(repository, { sendTimesheetSubmitted: vi.fn() });
    await expect(service.get(7, 99)).rejects.toMatchObject({ statusCode: 404, code: 'TIMESHEET_NOT_FOUND' });
  });

  it('requires both a declaration and at least one visit before submission', async () => {
    const noSummaryRepository = makeRepository({ findOwned: vi.fn(async () => ({ id: 7, work_date: '2026-10-17', status: 'DRAFT', daily_summary: 'Too short' })) });
    await expect(new TimesheetService(noSummaryRepository, {}).submit(7, { id: 3, fullName: 'Asha' })).rejects.toMatchObject({ code: 'DECLARATION_REQUIRED' });

    const noVisitsRepository = makeRepository({ submissionFacts: vi.fn(async () => ({ visitCount: 0 })) });
    await expect(new TimesheetService(noVisitsRepository, {}).submit(7, { id: 3, fullName: 'Asha' })).rejects.toMatchObject({ code: 'VISITS_REQUIRED' });
    expect(noVisitsRepository.submit).not.toHaveBeenCalled();
  });

  it('submits atomically and records an audit event', async () => {
    const repository = makeRepository();
    const email = { sendTimesheetSubmitted: vi.fn() };
    const service = new TimesheetService(repository, email);
    await service.submit(7, { id: 3, fullName: 'Asha Patel' }, { ip: '127.0.0.1' });
    expect(repository.submit).toHaveBeenCalledWith(7, 'SUBMITTED', expect.anything());
    expect(repository.audit).toHaveBeenCalledWith(expect.objectContaining({ action: 'TIMESHEET_SUBMITTED', actorUserId: 3 }), expect.anything());
  });

  it('rejects submitting a timesheet that is not a draft', async () => {
    const repository = makeRepository({ findOwned: vi.fn(async () => ({ id: 7, status: 'SUBMITTED', daily_summary: 'A complete daily declaration.' })) });
    const service = new TimesheetService(repository, {});

    await expect(service.submit(7, { id: 3, fullName: 'Asha Patel' })).rejects.toMatchObject({
      statusCode: 409, code: 'TIMESHEET_NOT_DRAFT',
    });
    expect(repository.submit).not.toHaveBeenCalled();
  });
});
