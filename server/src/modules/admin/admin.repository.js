import { pool, withTransaction } from '../../database/connection.js';

export class AdminRepository {
  transaction(work) { return withTransaction(work); }

  async dashboard(workDate, connection = pool) {
    const [[agents], [activity], [visits], [pending], [queue]] = await Promise.all([
      connection.execute("SELECT COUNT(*) total FROM users WHERE role = 'AGENT' AND status = 'ACTIVE'"),
      connection.execute('SELECT COUNT(DISTINCT agent_id) total FROM timesheets WHERE work_date = ?', [workDate]),
      connection.execute('SELECT COUNT(*) visits, COALESCE(SUM(TIMESTAMPDIFF(MINUTE, check_in_at, check_out_at)), 0) minutes FROM visits WHERE deleted_at IS NULL'),
      connection.execute("SELECT COUNT(*) total FROM timesheets WHERE status = 'SUBMITTED'"),
      connection.execute(`SELECT t.id, t.work_date, t.submitted_at, u.full_name agent_name, u.email agent_email,
        COUNT(v.id) visit_count, COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) duration_minutes
        FROM timesheets t JOIN users u ON u.id = t.agent_id LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL
        WHERE t.status = 'SUBMITTED' GROUP BY t.id ORDER BY t.submitted_at LIMIT 6`),
    ]);
    return { activeAgents: Number(agents[0].total), activeToday: Number(activity[0].total), visits: Number(visits[0].visits), minutes: Number(visits[0].minutes), pending: Number(pending[0].total), queue };
  }

  async listTimesheets(filters, connection = pool) {
    const where = ['1=1']; const values = [];
    if (filters.status) { where.push('t.status = ?'); values.push(filters.status); }
    if (filters.agentId) { where.push('t.agent_id = ?'); values.push(filters.agentId); }
    if (filters.startDate) { where.push('t.work_date >= ?'); values.push(filters.startDate); }
    if (filters.endDate) { where.push('t.work_date <= ?'); values.push(filters.endDate); }
    if (filters.search) { where.push('(u.full_name LIKE ? OR u.email LIKE ? OR r.full_name LIKE ?)'); const search = `%${filters.search}%`; values.push(search, search, search); }
    const offset = (filters.page - 1) * filters.pageSize;
    const sortColumns = { workDate: 't.work_date', agentName: 'u.full_name', visitCount: 'visit_count', duration: 'duration_minutes', status: 't.status' };
    const sortColumn = sortColumns[filters.sortBy] || sortColumns.workDate;
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const [rows] = await connection.execute(`SELECT t.id, t.work_date, t.status, t.submitted_at, t.reviewed_at, t.review_comment,
      u.full_name agent_name, u.email agent_email, r.full_name reviewer_name, COUNT(v.id) visit_count,
      COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) duration_minutes
      FROM timesheets t JOIN users u ON u.id = t.agent_id LEFT JOIN users r ON r.id = t.reviewed_by
      LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL WHERE ${where.join(' AND ')}
      GROUP BY t.id ORDER BY ${sortColumn} ${sortOrder}, t.id DESC LIMIT ? OFFSET ?`, [...values, filters.pageSize, offset]);
    const [counts] = await connection.execute(`SELECT COUNT(*) total FROM timesheets t JOIN users u ON u.id = t.agent_id
      LEFT JOIN users r ON r.id = t.reviewed_by WHERE ${where.join(' AND ')}`, values);
    return { rows, total: Number(counts[0].total) };
  }

  async workCalendar(startDate, endDate, connection = pool) {
    const [rows] = await connection.execute(`SELECT u.id agent_id, u.full_name agent_name, u.status agent_status,
      t.work_date, COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) approved_minutes
      FROM users u
      LEFT JOIN timesheets t ON t.agent_id = u.id AND t.status = 'APPROVED' AND t.work_date BETWEEN ? AND ?
      LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL
      WHERE u.role = 'AGENT'
      GROUP BY u.id, u.full_name, u.status, t.work_date
      ORDER BY u.full_name, t.work_date`, [startDate, endDate]);
    return rows;
  }

  async timesheetDetail(id, connection = pool, lock = false) {
    const [rows] = await connection.execute(`SELECT t.*, u.full_name agent_name, u.email agent_email, u.username agent_username
      FROM timesheets t JOIN users u ON u.id = t.agent_id WHERE t.id = ?${lock ? ' FOR UPDATE' : ''}`, [id]);
    if (!rows[0]) return null;
    const [visits] = await connection.execute(`SELECT id, company_id, company_name_snapshot, category, contact_person, purpose, visit_notes,
      check_in_at, check_out_at, TIMESTAMPDIFF(MINUTE, check_in_at, check_out_at) duration_minutes
      FROM visits WHERE timesheet_id = ? AND deleted_at IS NULL ORDER BY check_in_at`, [id]);
    const [reviews] = await connection.execute(`SELECT tr.id, tr.decision, tr.comment, tr.created_at, u.full_name reviewer_name
      FROM timesheet_reviews tr JOIN users u ON u.id = tr.reviewer_id WHERE tr.timesheet_id = ? ORDER BY tr.created_at DESC`, [id]);
    return { ...rows[0], visits, reviews };
  }

  async review(id, reviewerId, decision, comment, connection) {
    await connection.execute('INSERT INTO timesheet_reviews (timesheet_id, reviewer_id, decision, comment) VALUES (?, ?, ?, ?)', [id, reviewerId, decision, comment || null]);
    await connection.execute('UPDATE timesheets SET status = ?, reviewed_by = ?, reviewed_at = UTC_TIMESTAMP(6), review_comment = ? WHERE id = ?', [decision, reviewerId, comment || null, id]);
  }

  async listAgents(filters, connection = pool) {
    const where = ["u.role = 'AGENT'"]; const values = [];
    if (filters.search) { where.push('(u.full_name LIKE ? OR u.username LIKE ? OR u.email LIKE ?)'); const q = `%${filters.search}%`; values.push(q, q, q); }
    if (filters.status) { where.push('u.status = ?'); values.push(filters.status); }
    const offset = (filters.page - 1) * filters.pageSize;
    const [rows] = await connection.execute(`SELECT u.id, u.full_name, u.username, u.email, u.status, u.is_email_verified, u.created_at,
      COUNT(DISTINCT t.id) total_timesheets, COUNT(v.id) total_visits,
      COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) total_minutes
      FROM users u LEFT JOIN timesheets t ON t.agent_id = u.id LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL
      WHERE ${where.join(' AND ')} GROUP BY u.id ORDER BY u.full_name LIMIT ? OFFSET ?`, [...values, filters.pageSize, offset]);
    const [counts] = await connection.execute(`SELECT COUNT(*) total FROM users u WHERE ${where.join(' AND ')}`, values);
    return { rows, total: Number(counts[0].total) };
  }

  async setAgentStatus(id, status, connection) {
    const [rows] = await connection.execute("SELECT id, full_name, status FROM users WHERE id = ? AND role = 'AGENT' FOR UPDATE", [id]);
    if (!rows[0]) return null;
    await connection.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
    if (status === 'INACTIVE') await connection.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL', [id]);
    return rows[0];
  }

  async listCompanies(filters, connection = pool) {
    const where = ['1=1']; const values = [];
    if (filters.search) { where.push('c.company_name LIKE ?'); values.push(`%${filters.search}%`); }
    if (filters.reviewStatus) { where.push('c.review_status = ?'); values.push(filters.reviewStatus); }
    if (filters.status) { where.push('c.status = ?'); values.push(filters.status); }
    const offset = (filters.page - 1) * filters.pageSize;
    const [rows] = await connection.execute(`SELECT c.*, u.full_name creator_name, COUNT(v.id) visit_count
      FROM companies c JOIN users u ON u.id = c.created_by LEFT JOIN visits v ON v.company_id = c.id AND v.deleted_at IS NULL
      WHERE ${where.join(' AND ')} GROUP BY c.id ORDER BY c.review_status DESC, c.company_name LIMIT ? OFFSET ?`, [...values, filters.pageSize, offset]);
    const [counts] = await connection.execute(`SELECT COUNT(*) total FROM companies c WHERE ${where.join(' AND ')}`, values);
    return { rows, total: Number(counts[0].total) };
  }

  async updateCompany(id, changes, connection) {
    const [rows] = await connection.execute('SELECT * FROM companies WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0]) return null;
    await connection.execute('UPDATE companies SET status = ?, review_status = ? WHERE id = ?', [changes.status || rows[0].status, changes.reviewStatus || rows[0].review_status, id]);
    return rows[0];
  }

  async audit(data, connection) {
    await connection.execute(`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, ip_address)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [data.actorUserId, data.action, data.entityType, String(data.entityId), data.before ? JSON.stringify(data.before) : null, data.after ? JSON.stringify(data.after) : null, data.ipAddress || null]);
  }

  async listAudits(filters, connection = pool) {
    const where = ['1=1']; const values = [];
    if (filters.action) { where.push('a.action LIKE ?'); values.push(`%${filters.action}%`); }
    if (filters.entityType) { where.push('a.entity_type = ?'); values.push(filters.entityType); }
    if (filters.search) { where.push('(a.action LIKE ? OR a.entity_type LIKE ? OR a.entity_id LIKE ? OR u.full_name LIKE ? OR u.email LIKE ?)'); const search = `%${filters.search}%`; values.push(search, search, search, search, search); }
    const offset = (filters.page - 1) * filters.pageSize;
    const sortColumns = { createdAt: 'a.created_at', action: 'a.action', entityType: 'a.entity_type', actorName: 'u.full_name' };
    const sortColumn = sortColumns[filters.sortBy] || sortColumns.createdAt;
    const sortOrder = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const [rows] = await connection.execute(`SELECT a.*, u.full_name actor_name FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id
      WHERE ${where.join(' AND ')} ORDER BY ${sortColumn} ${sortOrder}, a.id DESC LIMIT ? OFFSET ?`, [...values, filters.pageSize, offset]);
    const [counts] = await connection.execute(`SELECT COUNT(*) total FROM audit_logs a LEFT JOIN users u ON u.id = a.actor_user_id WHERE ${where.join(' AND ')}`, values);
    return { rows, total: Number(counts[0].total) };
  }
}
