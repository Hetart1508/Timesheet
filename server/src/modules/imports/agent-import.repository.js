import { pool, withTransaction } from '../../database/connection.js';

export class AgentImportRepository {
  transaction(work) { return withTransaction(work); }

  async findUsersByEmails(emails, connection = pool) {
    if (!emails.length) return [];
    const placeholders = emails.map(() => '?').join(',');
    const [rows] = await connection.execute(`SELECT email_normalized FROM users WHERE email_normalized IN (${placeholders})`, emails);
    return rows;
  }

  async findOpenAgentInvitationsByEmails(emails, connection = pool) {
    if (!emails.length) return [];
    const placeholders = emails.map(() => '?').join(',');
    const [rows] = await connection.execute(`SELECT email_normalized FROM agent_invitations WHERE status <> 'ACCEPTED' AND email_normalized IN (${placeholders})`, emails);
    return rows;
  }

  async findAgentImportByHash(hash, connection = pool) {
    const [rows] = await connection.execute('SELECT id FROM agent_imports WHERE file_sha256 = ? LIMIT 1', [hash]);
    return rows[0] || null;
  }

  async createAgentImport(data, connection) {
    const [result] = await connection.execute(`INSERT INTO agent_imports (imported_by, file_name, file_sha256, row_count)
      VALUES (?, ?, ?, ?)`, [data.actorId, data.fileName, data.hash, data.rowCount]);
    return Number(result.insertId);
  }

  async createAgentInvitation(data, connection) {
    const [result] = await connection.execute(`INSERT INTO agent_invitations
      (import_id, invited_by, full_name, email, email_normalized, token_hash, expires_at, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PENDING')`, [
      data.importId, data.actorId, data.fullName, data.email, data.email, data.tokenHash, data.expiresAt,
    ]);
    return Number(result.insertId);
  }

  async auditAgentImport(data, connection) {
    await connection.execute(`INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, after_data, ip_address)
      VALUES (?, 'AGENTS_INVITED_FROM_EXCEL', 'AGENT_IMPORT', ?, ?, ?)`, [
      data.actorId, String(data.importId), JSON.stringify({ rowCount: data.rowCount }), data.ipAddress || null,
    ]);
  }

  async setAgentInvitationDelivery(id, status, connection = pool) {
    await connection.execute(`UPDATE agent_invitations SET status = ?, sent_at = IF(? = 'SENT', UTC_TIMESTAMP(6), sent_at) WHERE id = ?`, [status, status, id]);
  }

  async listOpenAgentInvitations(connection = pool) {
    const [rows] = await connection.execute(`SELECT id, full_name, email, status, expires_at FROM agent_invitations
      WHERE status <> 'ACCEPTED' ORDER BY created_at DESC LIMIT 100`);
    return rows;
  }

  async findOpenAgentInvitation(id, connection = pool) {
    const [rows] = await connection.execute(`SELECT id, full_name, email, status FROM agent_invitations
      WHERE id = ? AND status <> 'ACCEPTED' LIMIT 1`, [id]);
    return rows[0] || null;
  }

  async replaceAgentInvitationToken(id, tokenHash, expiresAt, connection = pool) {
    await connection.execute(`UPDATE agent_invitations SET token_hash = ?, expires_at = ?, status = 'PENDING'
      WHERE id = ? AND status <> 'ACCEPTED'`, [tokenHash, expiresAt, id]);
  }
}