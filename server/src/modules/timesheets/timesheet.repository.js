import { pool, withTransaction } from '../../database/connection.js';

export class TimesheetRepository {
  transaction(work) { return withTransaction(work); }

  async findOrCreate(agentId, workDate, connection = pool) {
    await connection.execute(
      `INSERT INTO timesheets (agent_id, work_date) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)`, [agentId, workDate],
    );
    const [rows] = await connection.execute('SELECT * FROM timesheets WHERE agent_id = ? AND work_date = ?', [agentId, workDate]);
    return rows[0];
  }

  async findOwned(id, agentId, connection = pool, lock = false) {
    const [rows] = await connection.execute(
      `SELECT * FROM timesheets WHERE id = ? AND agent_id = ?${lock ? ' FOR UPDATE' : ''}`, [id, agentId],
    );
    return rows[0] || null;
  }

  async detail(id, agentId, connection = pool) {
    const timesheet = await this.findOwned(id, agentId, connection);
    if (!timesheet) return null;
    const [visits] = await connection.execute(
      `SELECT v.id, v.company_id, v.company_name_snapshot, v.category, v.contact_person, v.purpose, v.visit_notes,
              v.check_in_at, v.check_out_at, TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at) AS duration_minutes
       FROM visits v WHERE v.timesheet_id = ? AND v.deleted_at IS NULL ORDER BY v.check_in_at, v.id`, [id],
    );
    const [reviews] = await connection.execute(
      `SELECT tr.id, tr.decision, tr.comment, tr.created_at, u.full_name AS reviewer_name
       FROM timesheet_reviews tr JOIN users u ON u.id = tr.reviewer_id
       WHERE tr.timesheet_id = ? ORDER BY tr.created_at DESC`, [id],
    );
    return { ...timesheet, visits, reviews };
  }

  async dashboard(agentId, workDate, connection = pool) {
    const [todayRows] = await connection.execute(
      `SELECT t.id, t.work_date, t.status, t.daily_summary,
              COUNT(v.id) AS visit_count,
              COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) AS duration_minutes
       FROM timesheets t LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL
       WHERE t.agent_id = ? AND t.work_date = ? GROUP BY t.id`, [agentId, workDate],
    );
    const [recent] = await connection.execute(
      `SELECT t.id, t.work_date, t.status, COUNT(v.id) AS visit_count,
              COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) AS duration_minutes
       FROM timesheets t LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL
       WHERE t.agent_id = ? GROUP BY t.id ORDER BY t.work_date DESC LIMIT 7`, [agentId],
    );
    return { today: todayRows[0] || null, recent };
  }

  async list(agentId, filters, connection = pool) {
    const where = ['t.agent_id = ?']; const values = [agentId];
    if (filters.startDate) { where.push('t.work_date >= ?'); values.push(filters.startDate); }
    if (filters.endDate) { where.push('t.work_date <= ?'); values.push(filters.endDate); }
    if (filters.status) { where.push('t.status = ?'); values.push(filters.status); }
    const offset = (filters.page - 1) * filters.pageSize;
    const [rows] = await connection.execute(
      `SELECT t.id, t.work_date, t.status, t.submitted_at, t.review_comment, COUNT(v.id) AS visit_count,
              COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) AS duration_minutes
       FROM timesheets t LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL
       WHERE ${where.join(' AND ')} GROUP BY t.id ORDER BY t.work_date DESC LIMIT ? OFFSET ?`,
      [...values, filters.pageSize, offset],
    );
    const [countRows] = await connection.execute(`SELECT COUNT(*) AS total FROM timesheets t WHERE ${where.join(' AND ')}`, values);
    return { rows, total: Number(countRows[0].total) };
  }

  async updateSummary(id, summary, connection) {
    await connection.execute('UPDATE timesheets SET daily_summary = ? WHERE id = ?', [summary, id]);
  }

  async getCompany(id, connection = pool) {
    const [rows] = await connection.execute("SELECT id, company_name, status FROM companies WHERE id = ? AND status = 'ACTIVE' LIMIT 1", [id]);
    return rows[0] || null;
  }

  async overlappingVisit(timesheetId, checkInAt, checkOutAt, excludeId, connection) {
    const [rows] = await connection.execute(
      `SELECT id FROM visits WHERE timesheet_id = ? AND deleted_at IS NULL AND id <> ?
       AND check_in_at < ? AND check_out_at > ? LIMIT 1`, [timesheetId, excludeId || 0, checkOutAt, checkInAt],
    );
    return rows[0] || null;
  }

  async createVisit(data, connection) {
    const [result] = await connection.execute(
      `INSERT INTO visits
      (timesheet_id, company_id, company_name_snapshot, category, contact_person, purpose, visit_notes, check_in_at, check_out_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [data.timesheetId, data.companyId, data.companyName, data.category, data.contactPerson, data.purpose, data.visitNotes, data.checkInAt, data.checkOutAt, data.userId, data.userId],
    );
    return result.insertId;
  }

  async findOwnedVisit(id, agentId, connection, lock = false) {
    const [rows] = await connection.execute(
      `SELECT v.*, t.agent_id, t.work_date, t.status AS timesheet_status
       FROM visits v JOIN timesheets t ON t.id = v.timesheet_id
       WHERE v.id = ? AND t.agent_id = ? AND v.deleted_at IS NULL${lock ? ' FOR UPDATE' : ''}`, [id, agentId],
    );
    return rows[0] || null;
  }

  async updateVisit(id, data, connection) {
    await connection.execute(
      `UPDATE visits SET company_id = ?, company_name_snapshot = ?, category = ?, contact_person = ?, purpose = ?,
       visit_notes = ?, check_in_at = ?, check_out_at = ?, updated_by = ? WHERE id = ?`,
      [data.companyId, data.companyName, data.category, data.contactPerson, data.purpose, data.visitNotes, data.checkInAt, data.checkOutAt, data.userId, id],
    );
  }

  async softDeleteVisit(id, userId, connection) {
    await connection.execute('UPDATE visits SET deleted_at = UTC_TIMESTAMP(6), deleted_by = ?, updated_by = ? WHERE id = ?', [userId, userId, id]);
  }

  async reopenAfterEdit(timesheet, connection) {
    if (timesheet.status === 'DRAFT') return;
    await connection.execute(
      `UPDATE timesheets SET status = 'DRAFT', submitted_at = NULL, reviewed_by = NULL,
       reviewed_at = NULL, review_comment = NULL WHERE id = ?`, [timesheet.id],
    );
  }

  async submissionFacts(id, connection) {
    const [rows] = await connection.execute(
      `SELECT COUNT(*) AS visit_count FROM visits WHERE timesheet_id = ? AND deleted_at IS NULL`, [id],
    );
    return { visitCount: Number(rows[0].visit_count) };
  }

  async submit(id, status, connection) {
    await connection.execute(
      `UPDATE timesheets SET status = ?, submitted_at = UTC_TIMESTAMP(6), reviewed_at = NULL,
       reviewed_by = NULL, review_comment = NULL WHERE id = ?`, [status, id],
    );
  }

  async adminRecipients(connection = pool) {
    const [rows] = await connection.execute("SELECT id, full_name, email FROM users WHERE role = 'ADMIN' AND status = 'ACTIVE' AND is_email_verified = TRUE");
    return rows;
  }

  async audit(data, connection) {
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.actorUserId, data.action, data.entityType, String(data.entityId), data.before ? JSON.stringify(data.before) : null, data.after ? JSON.stringify(data.after) : null, data.ipAddress || null],
    );
  }
}
