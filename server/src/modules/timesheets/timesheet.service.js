import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';
import { currentBusinessDate, istLocalToUtc, utcToIstTime, validateBusinessDate } from '../../utils/business-time.js';

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const minutesLabel = (minutes) => ({ minutes: Number(minutes), hours: Math.round((Number(minutes) / 60) * 100) / 100 });

export class TimesheetService {
  constructor(repository, emailService) { this.repository = repository; this.emailService = emailService; }

  mapSummary(row) {
    return {
      id: Number(row.id), workDate: dateOnly(row.work_date), status: row.status,
      visitCount: Number(row.visit_count || 0), duration: minutesLabel(row.duration_minutes || 0),
      submittedAt: row.submitted_at || null, reviewComment: row.review_comment || null,
    };
  }

  mapDetail(row) {
    return {
      id: Number(row.id), workDate: dateOnly(row.work_date), dailySummary: row.daily_summary || '',
      status: row.status, submittedAt: row.submitted_at || null, reviewedAt: row.reviewed_at || null,
      reviewComment: row.review_comment || null,
      visits: row.visits.map((visit) => ({
        id: Number(visit.id), companyId: Number(visit.company_id), companyName: visit.company_name_snapshot,
        category: visit.category, mdr: visit.mdr || 'Level 1', contactPerson: visit.contact_person, purpose: visit.purpose, visitNotes: visit.visit_notes,
        checkInTime: utcToIstTime(visit.check_in_at), checkOutTime: utcToIstTime(visit.check_out_at),
        duration: minutesLabel(visit.duration_minutes),
      })),
      reviews: row.reviews.map((review) => ({
        id: Number(review.id), decision: review.decision, comment: review.comment || '',
        reviewerName: review.reviewer_name, createdAt: review.created_at,
      })),
    };
  }

  async dashboard(agentId) {
    const workDate = currentBusinessDate();
    const data = await this.repository.dashboard(agentId, workDate);
    return { businessDate: workDate, today: data.today ? this.mapSummary(data.today) : null, recent: data.recent.map((row) => this.mapSummary(row)) };
  }

  async list(agentId, filters) {
    if (filters.startDate) validateBusinessDate(filters.startDate);
    if (filters.endDate) validateBusinessDate(filters.endDate);
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw new AppError(422, 'INVALID_DATE_RANGE', 'Start date must not be after end date');
    const result = await this.repository.list(agentId, filters);
    return { timesheets: result.rows.map((row) => this.mapSummary(row)), pagination: { page: filters.page, pageSize: filters.pageSize, total: result.total } };
  }

  async start(agentId, requestedDate) {
    const workDate = validateBusinessDate(requestedDate || currentBusinessDate());
    if (workDate > currentBusinessDate()) throw new AppError(422, 'FUTURE_TIMESHEET', 'A timesheet cannot be created for a future date');
    const timesheet = await this.repository.findOrCreate(agentId, workDate);
    return this.get(timesheet.id, agentId);
  }

  async startForAdmin(agentId, requestedDate) {
    if (!await this.repository.findActiveAgent(agentId)) throw new AppError(422, 'AGENT_NOT_ACTIVE', 'Select an active agent');
    return this.start(agentId, requestedDate);
  }

  async getForAdmin(id) {
    const timesheet = await this.repository.findById(id);
    if (!timesheet) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
    return this.get(id, timesheet.agent_id);
  }

  async ownerId(id) {
    const timesheet = await this.repository.findById(id);
    if (!timesheet) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
    return Number(timesheet.agent_id);
  }

  async updateSummaryForAdmin(id, actorId, dailySummary, request = {}) {
    return this.updateSummary(id, await this.ownerId(id), dailySummary, { ...request, actorUserId: actorId });
  }

  async addVisitForAdmin(id, actorId, input, request = {}) {
    return this.addVisit(id, await this.ownerId(id), input, { ...request, actorUserId: actorId });
  }

  async updateVisitForAdmin(visitId, timesheetId, actorId, input, request = {}) {
    return this.updateVisit(visitId, await this.ownerId(timesheetId), input, { ...request, actorUserId: actorId });
  }

  async deleteVisitForAdmin(visitId, timesheetId, actorId, request = {}) {
    return this.deleteVisit(visitId, await this.ownerId(timesheetId), { ...request, actorUserId: actorId });
  }

  async get(id, agentId) {
    const detail = await this.repository.detail(id, agentId);
    if (!detail) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
    return this.mapDetail(detail);
  }

  async updateSummary(id, agentId, dailySummary, request = {}) {
    await this.repository.transaction(async (connection) => {
      const timesheet = await this.repository.findOwned(id, agentId, connection, true);
      if (!timesheet) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
      await this.repository.updateSummary(id, dailySummary.trim(), connection);
      await this.repository.reopenAfterEdit(timesheet, connection);
      await this.repository.audit({ actorUserId: request.actorUserId || agentId, action: 'TIMESHEET_UPDATED', entityType: 'TIMESHEET', entityId: id, before: { dailySummary: timesheet.daily_summary, status: timesheet.status }, after: { dailySummary: dailySummary.trim(), status: 'DRAFT' }, ipAddress: request.ip }, connection);
    });
    return this.get(id, agentId);
  }

  visitTimes(workDate, input, existingVisits = []) {
    if (input.checkInTime && input.checkOutTime) {
      const checkInAt = istLocalToUtc(workDate, input.checkInTime);
      const checkOutAt = istLocalToUtc(workDate, input.checkOutTime);
      if (checkOutAt <= checkInAt) throw new AppError(422, 'INVALID_VISIT_DURATION', 'Check-out time must be later than check-in time');
      return { checkInAt, checkOutAt };
    }
    // Auto-assign a non-overlapping 1-hour slot
    const sorted = [...existingVisits].sort((a, b) => (a.check_out_at > b.check_out_at ? 1 : -1));
    const lastOut = sorted.length ? new Date(sorted[sorted.length - 1].check_out_at) : null;
    const base = lastOut || new Date(`${workDate}T03:30:00.000Z`); // 09:00 IST
    const checkInAt = new Date(base.getTime());
    const checkOutAt = new Date(base.getTime() + 60 * 60 * 1000);
    return { checkInAt: checkInAt.toISOString().replace('T', ' ').slice(0, 23), checkOutAt: checkOutAt.toISOString().replace('T', ' ').slice(0, 23) };
  }

  async addVisit(timesheetId, agentId, input, request = {}) {
    await this.repository.transaction(async (connection) => {
      const timesheet = await this.repository.findOwned(timesheetId, agentId, connection, true);
      if (!timesheet) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
      const company = await this.repository.getCompany(input.companyId, connection);
      if (!company) throw new AppError(422, 'COMPANY_NOT_FOUND', 'Select an active company');
      const existingVisits = (await this.repository.detail(timesheetId, agentId, connection))?.visits || [];
      const { checkInAt, checkOutAt } = this.visitTimes(dateOnly(timesheet.work_date), input, existingVisits);
      if (await this.repository.overlappingVisit(timesheetId, checkInAt, checkOutAt, null, connection)) throw new AppError(409, 'VISIT_OVERLAP', 'This visit overlaps another recorded visit');
      const visitId = await this.repository.createVisit({ ...input, timesheetId, userId: request.actorUserId || agentId, companyName: company.company_name, checkInAt, checkOutAt }, connection);
      await this.repository.reopenAfterEdit(timesheet, connection);
      await this.repository.audit({ actorUserId: request.actorUserId || agentId, action: 'VISIT_CREATED', entityType: 'VISIT', entityId: visitId, after: { ...input, companyName: company.company_name }, ipAddress: request.ip }, connection);
    });
    return this.get(timesheetId, agentId);
  }

  async updateVisit(visitId, agentId, input, request = {}) {
    let timesheetId;
    await this.repository.transaction(async (connection) => {
      const visit = await this.repository.findOwnedVisit(visitId, agentId, connection, true);
      if (!visit) throw new AppError(404, 'VISIT_NOT_FOUND', 'Visit not found');
      timesheetId = visit.timesheet_id;
      const company = await this.repository.getCompany(input.companyId, connection);
      if (!company) throw new AppError(422, 'COMPANY_NOT_FOUND', 'Select an active company');
      // Retain existing times when not provided (In/Out removed from agent form)
      const effectiveInput = {
        ...input,
        checkInTime: input.checkInTime || null,
        checkOutTime: input.checkOutTime || null,
      };
      const checkInAt = effectiveInput.checkInTime ? istLocalToUtc(dateOnly(visit.work_date), effectiveInput.checkInTime) : visit.check_in_at;
      const checkOutAt = effectiveInput.checkOutTime ? istLocalToUtc(dateOnly(visit.work_date), effectiveInput.checkOutTime) : visit.check_out_at;
      if (checkOutAt <= checkInAt) throw new AppError(422, 'INVALID_VISIT_DURATION', 'Check-out time must be later than check-in time');
      if (await this.repository.overlappingVisit(timesheetId, checkInAt, checkOutAt, visitId, connection)) throw new AppError(409, 'VISIT_OVERLAP', 'This visit overlaps another recorded visit');
      await this.repository.updateVisit(visitId, { ...input, userId: request.actorUserId || agentId, companyName: company.company_name, checkInAt, checkOutAt }, connection);
      await this.repository.reopenAfterEdit({ id: timesheetId, status: visit.timesheet_status }, connection);
      await this.repository.audit({ actorUserId: request.actorUserId || agentId, action: 'VISIT_UPDATED', entityType: 'VISIT', entityId: visitId, before: { companyId: visit.company_id, checkInAt: visit.check_in_at, checkOutAt: visit.check_out_at }, after: { ...input, companyName: company.company_name }, ipAddress: request.ip }, connection);
    });
    return this.get(timesheetId, agentId);
  }

  async deleteVisit(visitId, agentId, request = {}) {
    let timesheetId;
    await this.repository.transaction(async (connection) => {
      const visit = await this.repository.findOwnedVisit(visitId, agentId, connection, true);
      if (!visit) throw new AppError(404, 'VISIT_NOT_FOUND', 'Visit not found');
      timesheetId = visit.timesheet_id;
      await this.repository.softDeleteVisit(visitId, request.actorUserId || agentId, connection);
      await this.repository.reopenAfterEdit({ id: timesheetId, status: visit.timesheet_status }, connection);
      await this.repository.audit({ actorUserId: request.actorUserId || agentId, action: 'VISIT_DELETED', entityType: 'VISIT', entityId: visitId, before: { companyName: visit.company_name_snapshot, checkInAt: visit.check_in_at, checkOutAt: visit.check_out_at }, after: { deleted: true }, ipAddress: request.ip }, connection);
    });
    return this.get(timesheetId, agentId);
  }

  async deleteDraft(id, agentId, request = {}) {
    await this.repository.transaction(async (connection) => {
      const timesheet = await this.repository.findOwned(id, agentId, connection, true);
      if (!timesheet) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
      if (timesheet.status !== 'DRAFT') throw new AppError(409, 'TIMESHEET_DELETE_NOT_ALLOWED', 'Only draft timesheets can be deleted');
      if (await this.repository.hasSubmissionHistory(id, connection)) {
        throw new AppError(409, 'TIMESHEET_DELETE_NOT_ALLOWED', 'A timesheet that has been submitted or reviewed cannot be deleted');
      }
      const facts = await this.repository.submissionFacts(id, connection);
      await this.repository.audit({
        actorUserId: agentId,
        action: 'TIMESHEET_DELETED',
        entityType: 'TIMESHEET',
        entityId: id,
        before: {
          workDate: dateOnly(timesheet.work_date),
          dailySummary: timesheet.daily_summary || '',
          status: timesheet.status,
          visitCount: facts.visitCount,
        },
        after: { deleted: true },
        ipAddress: request.ip,
      }, connection);
      await this.repository.deleteDraft(id, connection);
    });
  }

  async submit(id, user, request = {}) {
    const result = await this.repository.transaction(async (connection) => {
      const timesheet = await this.repository.findOwned(id, user.id, connection, true);
      if (!timesheet) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
      if (timesheet.status !== 'DRAFT') throw new AppError(409, 'TIMESHEET_NOT_DRAFT', 'Edit the timesheet before submitting it again');
      if (!timesheet.daily_summary || timesheet.daily_summary.trim().length < 20) throw new AppError(422, 'DECLARATION_REQUIRED', 'Enter a declaration of at least 20 characters before submitting');
      const facts = await this.repository.submissionFacts(id, connection);
      if (!facts.visitCount) throw new AppError(422, 'VISITS_REQUIRED', 'Add at least one company visit before submitting');
      const status = env.APPROVAL_REQUIRED ? 'SUBMITTED' : 'APPROVED';
      await this.repository.submit(id, status, connection);
      await this.repository.audit({ actorUserId: user.id, action: 'TIMESHEET_SUBMITTED', entityType: 'TIMESHEET', entityId: id, before: { status: timesheet.status }, after: { status }, ipAddress: request.ip }, connection);
      return { admins: status === 'SUBMITTED' ? await this.repository.adminRecipients(connection) : [], status, workDate: dateOnly(timesheet.work_date) };
    });
    await Promise.all(result.admins.map((admin) => this.emailService.sendTimesheetSubmitted(admin, { id, agentName: user.fullName, workDate: result.workDate })));
    return this.get(id, user.id);
  }
}
