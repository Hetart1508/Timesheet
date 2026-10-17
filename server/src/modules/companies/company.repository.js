import { pool, withTransaction } from '../../database/connection.js';

export class CompanyRepository {
  transaction(work) { return withTransaction(work); }

  async list(filters, connection = pool) {
    const search = `%${filters.search.toLowerCase()}%`;
    const offset = (filters.page - 1) * filters.pageSize;
    const [rows] = await connection.execute(
      `SELECT id, company_name, address, contact_person, contact_phone, notes, review_status
       FROM companies WHERE status = 'ACTIVE' AND company_name_normalized LIKE ?
       ORDER BY company_name LIMIT ? OFFSET ?`, [search, filters.pageSize, offset],
    );
    const [counts] = await connection.execute(
      `SELECT COUNT(*) AS total FROM companies WHERE status = 'ACTIVE' AND company_name_normalized LIKE ?`, [search],
    );
    return { rows, total: Number(counts[0].total) };
  }

  async findDuplicate(normalizedName, connection) {
    const [rows] = await connection.execute(
      `SELECT id, company_name FROM companies WHERE company_name_normalized = ? AND status = 'ACTIVE' LIMIT 1`, [normalizedName],
    );
    return rows[0] || null;
  }

  async create(data, connection) {
    const [result] = await connection.execute(
      `INSERT INTO companies
       (company_name, company_name_normalized, address, contact_person, contact_phone, notes, review_status, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.companyName, data.normalizedName, data.address, data.contactPerson || null, data.contactPhone || null,
        data.notes || null, data.reviewStatus, data.userId],
    );
    return result.insertId;
  }

  async findById(id, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT id, company_name, address, contact_person, contact_phone, notes, status, review_status
       FROM companies WHERE id = ? LIMIT 1`, [id],
    );
    return rows[0] || null;
  }

  async update(id, data, connection) {
    const [rows] = await connection.execute('SELECT * FROM companies WHERE id = ? FOR UPDATE', [id]);
    if (!rows[0]) return null;
    await connection.execute(`UPDATE companies SET company_name = ?, company_name_normalized = ?, address = ?, contact_person = ?, contact_phone = ?, notes = ? WHERE id = ?`,
      [data.companyName, data.normalizedName, data.address, data.contactPerson || null, data.contactPhone || null, data.notes || null, id]);
    return rows[0];
  }

  async visits(id, connection = pool) {
    const [rows] = await connection.execute(`SELECT v.id, t.work_date, u.full_name agent_name, u.email agent_email,
      v.contact_person, v.purpose, v.visit_notes, v.check_in_at, v.check_out_at,
      TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at) duration_minutes
      FROM visits v JOIN timesheets t ON t.id = v.timesheet_id JOIN users u ON u.id = t.agent_id
      WHERE v.company_id = ? AND v.deleted_at IS NULL ORDER BY t.work_date DESC, v.check_in_at`, [id]);
    return rows;
  }

  async audit(data, connection) {
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data, ip_address)
       VALUES (?, ?, 'COMPANY', ?, ?, ?)`,
      [data.userId, data.action || 'COMPANY_CREATED', String(data.companyId), JSON.stringify(data.after), data.ipAddress || null],
    );
  }
}
