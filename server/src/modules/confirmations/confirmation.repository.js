import { pool, withTransaction } from '../../database/connection.js';

export class ConfirmationRepository {
  transaction(work) { return withTransaction(work); }

  async find(tokenHash, connection = pool, lock = false) {
    const [rows] = await connection.execute(`SELECT cr.*, t.work_date, t.daily_summary, t.status, u.full_name agent_name
      FROM timesheet_confirmation_requests cr JOIN timesheets t ON t.id = cr.timesheet_id JOIN users u ON u.id = t.agent_id
      WHERE cr.token_hash = ?${lock ? ' FOR UPDATE' : ''}`, [tokenHash]);
    if (!rows[0]) return null;
    const [visits] = await connection.execute(`SELECT company_name_snapshot company_name, category, mdr, contact_person, purpose, visit_notes,
      check_in_at, check_out_at, TIMESTAMPDIFF(MINUTE, check_in_at, check_out_at) duration_minutes
      FROM visits WHERE timesheet_id = ? AND deleted_at IS NULL ORDER BY check_in_at, id`, [rows[0].timesheet_id]);
    return { ...rows[0], visits };
  }

  async respond(request, response, connection) {
    const status = response === 'YES' ? 'APPROVED' : 'REJECTED';
    const comment = response === 'YES' ? 'Confirmed by agent through email.' : 'Agent indicated that corrections are required through email.';
    await connection.execute('UPDATE timesheet_confirmation_requests SET response = ?, responded_at = UTC_TIMESTAMP(6) WHERE id = ?', [response, request.id]);
    await connection.execute('UPDATE timesheets SET status = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(6), review_comment = ? WHERE id = ?', [status, request.requested_by, comment, request.timesheet_id]);
    await connection.execute(`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, created_at)
      VALUES (?, ?, 'TIMESHEET', ?, ?, ?, UTC_TIMESTAMP(6))`, [request.requested_by, `TIMESHEET_AGENT_${response}`, String(request.timesheet_id), JSON.stringify({ status: request.status }), JSON.stringify({ status, response })]);
    return status;
  }
}
