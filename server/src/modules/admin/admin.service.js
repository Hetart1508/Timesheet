import { AppError } from '../../utils/app-error.js';
import { ipVersion, normalizeIpAddress } from '../../utils/ip-address.js';
import { currentBusinessDate, utcToIstTime } from '../../utils/business-time.js';

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);
const duration = (minutes) => ({ minutes: Number(minutes || 0), hours: Math.round((Number(minutes || 0) / 60) * 100) / 100 });

export class AdminService {
  constructor(repository, emailService = null) { this.repository = repository; this.emailService = emailService; }

  async dashboard() {
    const data = await this.repository.dashboard(currentBusinessDate());
    return { metrics: { activeAgents: data.activeAgents, activeToday: data.activeToday, totalVisits: data.visits, totalDuration: duration(data.minutes), pendingReviews: data.pending }, pending: data.queue.map((row) => this.summary(row)) };
  }

  summary(row) {
    return { id: Number(row.id), workDate: dateOnly(row.work_date), status: row.status, agentName: row.agent_name, agentEmail: row.agent_email,
      visitCount: Number(row.visit_count || 0), duration: duration(row.duration_minutes), submittedAt: row.submitted_at || null,
      reviewedAt: row.reviewed_at || null, reviewerName: row.reviewer_name || null, reviewComment: row.review_comment || null };
  }

  async listTimesheets(filters) {
    if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) throw new AppError(422, 'INVALID_DATE_RANGE', 'Start date must not be after end date');
    const result = await this.repository.listTimesheets(filters);
    return { timesheets: result.rows.map((row) => this.summary(row)), pagination: { page: filters.page, pageSize: filters.pageSize, total: result.total } };
  }

  async workCalendar(month, agentId) {
    const [year, monthNumber] = month.split('-').map(Number);
    const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const startDate = `${month}-01`;
    const endDate = `${month}-${String(daysInMonth).padStart(2, '0')}`;
    const rows = await this.repository.workCalendar(startDate, endDate, agentId);
    const agents = new Map();
    for (const row of rows) {
      const agentId = Number(row.agent_id);
      if (!agents.has(agentId)) {
        agents.set(agentId, { id: agentId, fullName: row.agent_name, status: row.agent_status, approvedHoursByDate: {} });
      }
      if (row.work_date) {
        const date = dateOnly(row.work_date);
        agents.get(agentId).approvedHoursByDate[date] = Math.round((Number(row.approved_minutes || 0) / 60) * 100) / 100;
      }
    }
    return { month, agents: [...agents.values()] };
  }

  async timesheet(id) {
    const row = await this.repository.timesheetDetail(id);
    if (!row) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
    return { id: Number(row.id), workDate: dateOnly(row.work_date), status: row.status, dailySummary: row.daily_summary || '', submittedAt: row.submitted_at,
      reviewedAt: row.reviewed_at, reviewComment: row.review_comment || '', agent: { id: Number(row.agent_id), fullName: row.agent_name, email: row.agent_email, username: row.agent_username },
      visits: row.visits.map((visit) => ({ id: Number(visit.id), companyId: Number(visit.company_id), companyName: visit.company_name_snapshot, category: visit.category, contactPerson: visit.contact_person,
        purpose: visit.purpose, visitNotes: visit.visit_notes, mdr: visit.mdr || 'Level 1', checkInTime: utcToIstTime(visit.check_in_at), checkOutTime: utcToIstTime(visit.check_out_at), duration: duration(visit.duration_minutes) })),
      reviews: row.reviews.map((review) => ({ id: Number(review.id), decision: review.decision, comment: review.comment || '', reviewerName: review.reviewer_name, createdAt: review.created_at })) };
  }

  async review(id, reviewer, input, request = {}) {
    let reviewedAgent;
    await this.repository.transaction(async (connection) => {
      const timesheet = await this.repository.timesheetDetail(id, connection, true);
      if (!timesheet) throw new AppError(404, 'TIMESHEET_NOT_FOUND', 'Timesheet not found');
      if (timesheet.status !== 'SUBMITTED') throw new AppError(409, 'TIMESHEET_NOT_REVIEWABLE', 'Only submitted timesheets can be reviewed');
      reviewedAgent = { email: timesheet.agent_email, fullName: timesheet.agent_name, workDate: dateOnly(timesheet.work_date) };
      await this.repository.review(id, reviewer.id, input.decision, input.comment, connection);
      await this.repository.audit({ actorUserId: reviewer.id, action: `TIMESHEET_${input.decision}`, entityType: 'TIMESHEET', entityId: id,
        before: { status: timesheet.status }, after: { status: input.decision, comment: input.comment }, ipAddress: request.ip }, connection);
    });
    if (this.emailService && reviewedAgent?.email) await this.emailService.sendTimesheetReviewed(reviewedAgent, { id, workDate: reviewedAgent.workDate, decision: input.decision, comment: input.comment });
    return this.timesheet(id);
  }

  async agents(filters) {
    const result = await this.repository.listAgents(filters);
    return { agents: result.rows.map((row) => ({ id: Number(row.id), fullName: row.full_name, username: row.username, email: row.email, status: row.status,
      accountRole: row.account_role || 'AGENT', canManageStatus: (row.account_role || 'AGENT') === 'AGENT',
      emailVerified: Boolean(row.is_email_verified), createdAt: row.created_at, totalTimesheets: Number(row.total_timesheets), totalVisits: Number(row.total_visits), totalDuration: duration(row.total_minutes) })),
      pagination: { page: filters.page, pageSize: filters.pageSize, total: result.total } };
  }

  async setAgentStatus(id, status, actor, request = {}) {
    await this.repository.transaction(async (connection) => {
      const before = await this.repository.setAgentStatus(id, status, connection);
      if (!before) throw new AppError(404, 'AGENT_NOT_FOUND', 'Agent not found');
      await this.repository.audit({ actorUserId: actor.id, action: 'AGENT_STATUS_CHANGED', entityType: 'USER', entityId: id, before: { status: before.status }, after: { status }, ipAddress: request.ip }, connection);
    });
  }

  async companies(filters) {
    const result = await this.repository.listCompanies(filters);
    return { companies: result.rows.map((row) => ({ id: Number(row.id), companyName: row.company_name, address: row.address, contactPerson: row.contact_person || '', contactPhone: row.contact_phone || '', notes: row.notes || '', status: row.status, reviewStatus: row.review_status, creatorName: row.creator_name, visitCount: Number(row.visit_count) })), pagination: { page: filters.page, pageSize: filters.pageSize, total: result.total } };
  }

  async updateCompany(id, changes, actor, request = {}) {
    await this.repository.transaction(async (connection) => {
      const before = await this.repository.updateCompany(id, changes, connection);
      if (!before) throw new AppError(404, 'COMPANY_NOT_FOUND', 'Company not found');
      await this.repository.audit({ actorUserId: actor.id, action: 'COMPANY_STATUS_CHANGED', entityType: 'COMPANY', entityId: id,
        before: { status: before.status, reviewStatus: before.review_status }, after: changes, ipAddress: request.ip }, connection);
    });
  }

  async audits(filters) {
    const result = await this.repository.listAudits(filters);
    return { audits: result.rows.map((row) => ({ id: Number(row.id), actorName: row.actor_name || 'System', action: row.action, entityType: row.entity_type, entityId: row.entity_id,
      before: row.before_data, after: row.after_data, ipAddress: row.ip_address, createdAt: row.created_at })), pagination: { page: filters.page, pageSize: filters.pageSize, total: result.total } };
  }

  async sessions(filters) {
    const result = await this.repository.listSessions(filters);
    return {
      sessions: result.rows.map((row) => {
        const address = normalizeIpAddress(row.ip_address);
        return {
          id: row.id,
          userId: Number(row.user_id),
          fullName: row.full_name,
          email: row.email,
          role: row.role,
          ipAddress: address,
          ipVersion: ipVersion(address),
          userAgent: row.user_agent,
          loginAt: row.created_at,
          lastUsedAt: row.last_used_at,
          expiresAt: row.expires_at,
          status: row.session_status,
        };
      }),
      pagination: { page: filters.page, pageSize: filters.pageSize, total: result.total },
    };
  }
}
