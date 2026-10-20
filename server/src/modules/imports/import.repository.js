import { pool, withTransaction } from '../../database/connection.js';

export class ImportRepository {
  transaction(work) { return withTransaction(work); }

  async findAgentsByEmails(emails, connection = pool) {
    if (!emails.length) return [];
    const placeholders = emails.map(() => '?').join(',');
    const [rows] = await connection.execute(`SELECT id, full_name, email_normalized, status FROM users WHERE role = 'AGENT' AND email_normalized IN (${placeholders})`, emails);
    return rows;
  }

  async findCompaniesByNames(names, connection = pool) {
    if (!names.length) return [];
    const placeholders = names.map(() => '?').join(',');
    const [rows] = await connection.execute(`SELECT id, company_name, company_name_normalized, status FROM companies WHERE company_name_normalized IN (${placeholders}) ORDER BY status = 'ACTIVE' DESC, id`, names);
    return rows;
  }

  async findTimesheetsByAgentDates(pairs, connection = pool) {
    if (!pairs.length) return [];
    const where = pairs.map(() => '(agent_id = ? AND work_date = ?)').join(' OR ');
    const values = pairs.flatMap(({ agentId, workDate }) => [agentId, workDate]);
    const [rows] = await connection.execute(`SELECT id, agent_id, work_date FROM timesheets WHERE ${where}`, values);
    return rows;
  }

  async findImportByHash(hash, connection = pool) {
    const [rows] = await connection.execute('SELECT id, file_name, created_at FROM data_imports WHERE file_sha256 = ? LIMIT 1', [hash]);
    return rows[0] || null;
  }

  async createCompany(row, actorId, connection) {
    const [result] = await connection.execute(`INSERT INTO companies
      (company_name, company_name_normalized, address, contact_person, review_status, status, created_by)
      VALUES (?, ?, ?, ?, 'APPROVED', 'ACTIVE', ?)`, [row.companyName, row.companyNormalized, row.companyAddress, row.contactPerson || null, actorId]);
    return Number(result.insertId);
  }

  async createTimesheet(group, actorId, connection) {
    const submitted = group.status !== 'DRAFT';
    const approved = group.status === 'APPROVED';
    const [result] = await connection.execute(`INSERT INTO timesheets
      (agent_id, work_date, daily_summary, status, submitted_at, reviewed_by, reviewed_at, review_comment)
      VALUES (?, ?, ?, ?, ${submitted ? 'UTC_TIMESTAMP(6)' : 'NULL'}, ?, ${approved ? 'UTC_TIMESTAMP(6)' : 'NULL'}, ?)`,
    [group.agentId, group.workDate, group.dailySummary || null, group.status, approved ? actorId : null, approved ? 'Imported and approved by administrator.' : null]);
    const id = Number(result.insertId);
    if (approved) await connection.execute("INSERT INTO timesheet_reviews (timesheet_id, reviewer_id, decision, comment) VALUES (?, ?, 'APPROVED', ?)", [id, actorId, 'Imported and approved by administrator.']);
    return id;
  }

  async createVisit(timesheetId, row, companyId, actorId, connection) {
    await connection.execute(`INSERT INTO visits
      (timesheet_id, company_id, company_name_snapshot, category, contact_person, purpose, visit_notes, check_in_at, check_out_at, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [timesheetId, companyId, row.companyName, row.category, row.contactPerson, row.purpose, row.visitNotes, row.checkInAt, row.checkOutAt, actorId, actorId]);
  }

  async recordImport(data, connection) {
    const [result] = await connection.execute(`INSERT INTO data_imports
      (imported_by, file_name, file_sha256, row_count, timesheet_count, visit_count, company_count)
      VALUES (?, ?, ?, ?, ?, ?, ?)`, [data.actorId, data.fileName, data.hash, data.rowCount, data.timesheetCount, data.visitCount, data.companyCount]);
    return Number(result.insertId);
  }

  async auditImport(data, connection) {
    await connection.execute(`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data, ip_address)
      VALUES (?, 'EXCEL_DATA_IMPORTED', 'DATA_IMPORT', ?, ?, ?)`, [data.actorId, String(data.importId), JSON.stringify(data.summary), data.ipAddress || null]);
  }

  async history(connection = pool) {
    const [rows] = await connection.execute(`SELECT i.id, i.file_name, i.row_count, i.timesheet_count, i.visit_count, i.company_count, i.created_at,
      u.full_name imported_by_name FROM data_imports i JOIN users u ON u.id = i.imported_by ORDER BY i.created_at DESC LIMIT 25`);
    return rows;
  }
}
