import { pool } from '../../database/connection.js';

const dateWhere = (filters, column = 't.work_date') => {
  const where = []; const values = [];
  if (filters.startDate) { where.push(`${column} >= ?`); values.push(filters.startDate); }
  if (filters.endDate) { where.push(`${column} <= ?`); values.push(filters.endDate); }
  return { sql: where.length ? `WHERE ${where.join(' AND ')}` : '', values };
};

export class ReportRepository {
  async analytics(filters, connection = pool) {
    const scope = dateWhere(filters);
    const [daily] = await connection.execute(`SELECT t.work_date,
      COUNT(DISTINCT t.agent_id) active_agents, COUNT(DISTINCT t.id) timesheet_count,
      COUNT(v.id) visit_count, COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) duration_minutes,
      COUNT(DISTINCT CASE WHEN t.status = 'APPROVED' THEN t.id END) approved_count,
      COUNT(DISTINCT CASE WHEN t.status = 'SUBMITTED' THEN t.id END) pending_count
      FROM timesheets t LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL ${scope.sql}
      GROUP BY t.work_date ORDER BY t.work_date DESC LIMIT 90`, scope.values);
    const [monthly] = await connection.execute(`SELECT DATE_FORMAT(t.work_date, '%Y-%m') month_key,
      COUNT(DISTINCT t.id) timesheet_count, COUNT(v.id) visit_count,
      COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) duration_minutes,
      COUNT(DISTINCT CASE WHEN t.status = 'APPROVED' THEN t.id END) approved_count,
      COUNT(DISTINCT CASE WHEN t.status IN ('REJECTED','CHANGES_REQUESTED') THEN t.id END) correction_count
      FROM timesheets t LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL ${scope.sql}
      GROUP BY month_key ORDER BY month_key DESC LIMIT 24`, scope.values);
    const [agents] = await connection.execute(`SELECT u.id agent_id, u.full_name agent_name, u.email agent_email,
      COUNT(DISTINCT t.id) timesheet_count, COUNT(DISTINCT CASE WHEN t.status = 'APPROVED' THEN t.id END) approved_count,
      COUNT(v.id) visit_count, COUNT(DISTINCT v.company_id) companies_covered,
      COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) duration_minutes
      FROM users u LEFT JOIN timesheets t ON t.agent_id = u.id ${scope.sql ? `AND ${scope.sql.slice(6)}` : ''}
      LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL WHERE u.role IN ('ADMIN', 'AGENT')
      GROUP BY u.id ORDER BY duration_minutes DESC, u.full_name`, scope.values);
    const [companies] = await connection.execute(`SELECT c.id company_id, c.company_name, c.contact_person,
      COUNT(v.id) visit_count, COUNT(DISTINCT t.agent_id) agents_count,
      COALESCE(SUM(TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at)), 0) duration_minutes,
      MAX(t.work_date) last_visited_date
      FROM companies c LEFT JOIN visits v ON v.company_id = c.id AND v.deleted_at IS NULL
      LEFT JOIN timesheets t ON t.id = v.timesheet_id ${scope.sql ? `AND ${scope.sql.slice(6)}` : ''}
      GROUP BY c.id ORDER BY visit_count DESC, c.company_name`, scope.values);
    return { daily, monthly, agents, companies };
  }

  async exportRows(filters, connection = pool) {
    const where = ['1=1']; const values = [];
    if (filters.agentId) { where.push('t.agent_id = ?'); values.push(filters.agentId); }
    if (filters.status) { where.push('t.status = ?'); values.push(filters.status); }
    if (filters.startDate) { where.push('t.work_date >= ?'); values.push(filters.startDate); }
    if (filters.endDate) { where.push('t.work_date <= ?'); values.push(filters.endDate); }
    const [rows] = await connection.execute(`SELECT t.id timesheet_id, t.work_date, t.status, t.submitted_at, t.review_comment,
      u.full_name agent_name, u.email agent_email, v.company_name_snapshot company_name,
      v.category, v.contact_person, v.purpose, v.visit_notes, v.check_in_at, v.check_out_at,
      CASE WHEN v.id IS NULL THEN 0 ELSE TIMESTAMPDIFF(MINUTE, v.check_in_at, v.check_out_at) END duration_minutes
      FROM timesheets t JOIN users u ON u.id = t.agent_id
      LEFT JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL
      WHERE ${where.join(' AND ')} ORDER BY t.work_date DESC, t.id DESC, v.check_in_at`, values);
    return rows;
  }

  async invoiceRows(agentId, month, connection = pool) {
    const monthStart = `${month}-01`;
    const [rows] = await connection.execute(`SELECT u.id agent_id, u.full_name agent_name, u.email agent_email,
      t.work_date, v.id visit_id, v.company_name_snapshot company_name, v.category, v.purpose,
      v.check_in_at, v.check_out_at
      FROM timesheets t JOIN users u ON u.id = t.agent_id
      JOIN visits v ON v.timesheet_id = t.id AND v.deleted_at IS NULL
      WHERE t.agent_id = ? AND t.status = 'APPROVED' AND t.work_date >= ?
        AND t.work_date < DATE_ADD(?, INTERVAL 1 MONTH)
      ORDER BY t.work_date, v.check_in_at, v.id`, [agentId, monthStart, monthStart]);
    return rows;
  }

  async auditInvoice(actorId, invoice, ipAddress, connection = pool) {
    await connection.execute(`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data, ip_address)
      VALUES (?, 'INVOICE_GENERATED', 'INVOICE', ?, ?, ?)`, [
      actorId, `${invoice.agent.id}-${invoice.month}`,
      JSON.stringify({ agentId: invoice.agent.id, month: invoice.month, visitCount: invoice.items.length, totalAmount: invoice.totalAmount }),
      ipAddress || null,
    ]);
  }

  async auditExport(actorId, format, filters, ipAddress, connection = pool) {
    await connection.execute(`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data, ip_address)
      VALUES (?, ?, 'EXPORT', ?, ?, ?)`, [actorId, `EXPORT_${format.toUpperCase()}`, format, JSON.stringify({ filters }), ipAddress || null]);
  }
}
