import { AppError } from '../../utils/app-error.js';
import { hashToken } from '../../utils/crypto.js';

const dateOnly = (value) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value).slice(0, 10);

export class ConfirmationService {
  constructor(repository) { this.repository = repository; }

  async get(rawToken) {
    const request = await this.repository.find(hashToken(rawToken));
    if (!request) throw new AppError(404, 'CONFIRMATION_NOT_FOUND', 'This confirmation link is invalid');
    const expired = new Date(request.expires_at).getTime() <= Date.now();
    return { agentName: request.agent_name, workDate: dateOnly(request.work_date), dailySummary: request.daily_summary || '',
      visitCount: request.visits.length, durationMinutes: request.visits.reduce((total, visit) => total + Number(visit.duration_minutes), 0),
      visits: request.visits.map((visit) => ({ companyName: visit.company_name, category: visit.category, mdr: visit.mdr,
        contactPerson: visit.contact_person, purpose: visit.purpose, visitNotes: visit.visit_notes, durationMinutes: Number(visit.duration_minutes) })),
      response: request.response, expired };
  }

  async respond(rawToken, response) {
    return this.repository.transaction(async (connection) => {
      const request = await this.repository.find(hashToken(rawToken), connection, true);
      if (!request) throw new AppError(404, 'CONFIRMATION_NOT_FOUND', 'This confirmation link is invalid');
      if (request.responded_at) throw new AppError(409, 'CONFIRMATION_ALREADY_USED', 'This timesheet has already been confirmed');
      if (new Date(request.expires_at).getTime() <= Date.now()) throw new AppError(410, 'CONFIRMATION_EXPIRED', 'This confirmation link has expired. Ask the Admin to send a new one.');
      if (request.status !== 'SUBMITTED') throw new AppError(409, 'TIMESHEET_ALREADY_CHANGED', 'This timesheet changed after the email was sent. Ask the Admin to send a new confirmation.');
      return { status: await this.repository.respond(request, response, connection), response };
    });
  }
}
