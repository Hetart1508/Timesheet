import { pool, withTransaction } from '../../database/connection.js';
import { timingSafeEqual } from '../../utils/crypto.js';

const publicUserColumns = `id, full_name, username, email, role, is_email_verified, status, created_at, last_login_at`;

export class AuthRepository {
  transaction(work) { return withTransaction(work); }

  async findIdentity(identifier, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT id, full_name, username, email, password_hash, role, is_email_verified, status
       FROM users WHERE username_normalized = ? OR email_normalized = ? LIMIT 1`,
      [identifier, identifier],
    );
    return rows[0] || null;
  }

  async findUserById(id, connection = pool) {
    const [rows] = await connection.execute(`SELECT ${publicUserColumns} FROM users WHERE id = ? LIMIT 1`, [id]);
    return rows[0] || null;
  }

  async findAuthenticatedUser(userId, sessionId, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT u.id, u.full_name, u.username, u.email, u.password_hash, u.role,
              u.is_email_verified, u.status, u.created_at, u.last_login_at
       FROM users u JOIN auth_sessions s ON s.user_id = u.id
       WHERE u.id = ? AND s.id = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP(6)
       LIMIT 1`, [userId, sessionId],
    );
    return rows[0] || null;
  }

  async findUserByEmail(email, connection = pool) {
    const [rows] = await connection.execute(
      `SELECT id, full_name, username, email, password_hash, role, is_email_verified, status
       FROM users WHERE email_normalized = ? LIMIT 1`, [email],
    );
    return rows[0] || null;
  }

  async createAgent(data, connection) {
    const [result] = await connection.execute(
      `INSERT INTO users
       (full_name, username, username_normalized, email, email_normalized, password_hash, role, is_email_verified, status)
       VALUES (?, ?, ?, ?, ?, ?, 'AGENT', FALSE, 'ACTIVE')`,
      [data.fullName, data.username, data.usernameNormalized, data.email, data.emailNormalized, data.passwordHash],
    );
    return result.insertId;
  }

  async createInvitedAgent(data, connection) {
    const [result] = await connection.execute(
      `INSERT INTO users
       (full_name, username, username_normalized, email, email_normalized, password_hash, role, is_email_verified, status)
       VALUES (?, ?, ?, ?, ?, ?, 'AGENT', TRUE, 'ACTIVE')`,
      [data.fullName, data.username, data.usernameNormalized, data.email, data.emailNormalized, data.passwordHash],
    );
    return Number(result.insertId);
  }

  async findAgentInvitationByToken(tokenHash, connection) {
    const [rows] = await connection.execute(`SELECT id, full_name, email, email_normalized FROM agent_invitations
      WHERE token_hash = ? AND status IN ('PENDING', 'SENT') AND expires_at > UTC_TIMESTAMP(6) LIMIT 1 FOR UPDATE`, [tokenHash]);
    return rows[0] || null;
  }

  async consumeAgentInvitation(invitationId, userId, connection) {
    await connection.execute(`UPDATE agent_invitations SET status = 'ACCEPTED', accepted_user_id = ?, accepted_at = UTC_TIMESTAMP(6), token_hash = NULL
      WHERE id = ? AND status IN ('PENDING', 'SENT') AND expires_at > UTC_TIMESTAMP(6)`, [userId, invitationId]);
  }

  async createUser(data, connection) {
    const [result] = await connection.execute(
      `INSERT INTO users
       (full_name, username, username_normalized, email, email_normalized, password_hash, role, is_email_verified, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [data.fullName, data.username, data.usernameNormalized, data.email, data.emailNormalized, data.passwordHash, data.role, data.emailVerified],
    );
    return result.insertId;
  }

  async countAdmins(connection = pool) {
    const [rows] = await connection.query("SELECT COUNT(*) AS count FROM users WHERE role = 'ADMIN'");
    return Number(rows[0].count);
  }

  async replaceVerificationToken(userId, tokenHash, expiresAt, connection) {
    await connection.execute('DELETE FROM email_verification_tokens WHERE user_id = ? AND consumed_at IS NULL', [userId]);
    await connection.execute(
      'INSERT INTO email_verification_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt],
    );
  }

  async consumeVerificationOtp(emailNormalized, tokenHash, maxAttempts, connection) {
    const [rows] = await connection.execute(
      `SELECT evt.id, evt.user_id, evt.token_hash, evt.expires_at, evt.consumed_at, evt.attempt_count,
              u.email, u.full_name, u.role, u.is_email_verified
       FROM email_verification_tokens evt JOIN users u ON u.id = evt.user_id
       WHERE u.email_normalized = ? ORDER BY evt.created_at DESC LIMIT 1 FOR UPDATE`, [emailNormalized],
    );
    const token = rows[0];
    if (!token) return null;
    if (token.consumed_at || new Date(token.expires_at) <= new Date() || token.attempt_count >= maxAttempts) return { invalid: true };
    if (!timingSafeEqual(token.token_hash, tokenHash)) {
      const attempts = Number(token.attempt_count) + 1;
      await connection.execute(
        'UPDATE email_verification_tokens SET attempt_count = ?, consumed_at = IF(? >= ?, UTC_TIMESTAMP(6), consumed_at) WHERE id = ?',
        [attempts, attempts, maxAttempts, token.id],
      );
      return { invalid: true };
    }
    await connection.execute('UPDATE email_verification_tokens SET consumed_at = UTC_TIMESTAMP(6) WHERE id = ?', [token.id]);
    await connection.execute('UPDATE users SET is_email_verified = TRUE WHERE id = ?', [token.user_id]);
    return token;
  }

  async replaceAdminLoginChallenge(id, userId, tokenHash, expiresAt, connection) {
    await connection.execute('DELETE FROM admin_login_challenges WHERE user_id = ? AND consumed_at IS NULL', [userId]);
    await connection.execute(
      'INSERT INTO admin_login_challenges (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)',
      [id, userId, tokenHash, expiresAt],
    );
  }

  async consumeAdminLoginOtp(challengeId, emailNormalized, tokenHash, maxAttempts, connection) {
    const [rows] = await connection.execute(
      `SELECT alc.id, alc.user_id, alc.token_hash, alc.expires_at, alc.consumed_at, alc.attempt_count,
              u.full_name, u.username, u.email, u.role, u.is_email_verified, u.status
       FROM admin_login_challenges alc JOIN users u ON u.id = alc.user_id
       WHERE alc.id = ? AND u.email_normalized = ? FOR UPDATE`,
      [challengeId, emailNormalized],
    );
    const challenge = rows[0];
    if (!challenge || challenge.consumed_at || new Date(challenge.expires_at) <= new Date()
      || challenge.attempt_count >= maxAttempts || challenge.role !== 'ADMIN'
      || !challenge.is_email_verified || challenge.status !== 'ACTIVE') return { invalid: true };
    if (!timingSafeEqual(challenge.token_hash, tokenHash)) {
      const attempts = Number(challenge.attempt_count) + 1;
      await connection.execute(
        'UPDATE admin_login_challenges SET attempt_count = ?, consumed_at = IF(? >= ?, UTC_TIMESTAMP(6), consumed_at) WHERE id = ?',
        [attempts, attempts, maxAttempts, challenge.id],
      );
      return { invalid: true };
    }
    await connection.execute('UPDATE admin_login_challenges SET consumed_at = UTC_TIMESTAMP(6) WHERE id = ?', [challenge.id]);
    return challenge;
  }

  async replaceResetToken(userId, tokenHash, expiresAt, connection) {
    await connection.execute('DELETE FROM password_reset_tokens WHERE user_id = ? AND consumed_at IS NULL', [userId]);
    await connection.execute(
      'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
      [userId, tokenHash, expiresAt],
    );
  }

  async consumeResetToken(tokenHash, passwordHash, connection) {
    const [rows] = await connection.execute(
      `SELECT prt.id, prt.user_id, prt.expires_at, prt.consumed_at, u.email, u.full_name
       FROM password_reset_tokens prt JOIN users u ON u.id = prt.user_id
       WHERE prt.token_hash = ? FOR UPDATE`, [tokenHash],
    );
    const token = rows[0];
    if (!token || token.consumed_at || new Date(token.expires_at) <= new Date()) return null;
    await connection.execute('UPDATE password_reset_tokens SET consumed_at = UTC_TIMESTAMP(6) WHERE id = ?', [token.id]);
    await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, token.user_id]);
    await connection.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL', [token.user_id]);
    return token;
  }

  async createSession(data, connection = pool) {
    await connection.execute(
      `INSERT INTO auth_sessions
        (id, user_id, refresh_token_hash, expires_at, created_at, ip_address, user_agent)
        VALUES (?, ?, ?, ?, UTC_TIMESTAMP(6), ?, ?)`,
            [data.id, data.userId, data.refreshTokenHash, data.expiresAt, data.ipAddress, data.userAgent],
    );
  }

  async rotateSession(currentHash, nextHash, connection) {
    const [rows] = await connection.execute(
      `SELECT s.id AS session_id, s.user_id AS id, s.user_id, s.refresh_token_hash, s.previous_token_hash, s.expires_at, s.revoked_at,
              u.full_name, u.username, u.email, u.role, u.is_email_verified, u.status
       FROM auth_sessions s JOIN users u ON u.id = s.user_id
       WHERE s.refresh_token_hash = ? OR s.previous_token_hash = ? FOR UPDATE`, [currentHash, currentHash],
    );
    const session = rows[0];
    if (!session) return null;
    if (session.previous_token_hash === currentHash) {
      await connection.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL', [session.user_id]);
      return { reused: true };
    }
    if (session.revoked_at || new Date(session.expires_at) <= new Date()) return null;
    await connection.execute(
      `UPDATE auth_sessions SET previous_token_hash = refresh_token_hash, refresh_token_hash = ?,
       last_used_at = UTC_TIMESTAMP(6) WHERE id = ?`, [nextHash, session.session_id],
    );
    return session;
  }

  async revokeSessionByToken(tokenHash, connection = pool) {
    await connection.execute(
      'UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE refresh_token_hash = ? AND revoked_at IS NULL', [tokenHash],
    );
  }

  async revokeAllSessions(userId, connection = pool) {
    await connection.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL', [userId]);
  }

  async touchLogin(userId, connection = pool) {
    await connection.execute('UPDATE users SET last_login_at = UTC_TIMESTAMP(6) WHERE id = ?', [userId]);
  }

  async updatePassword(userId, passwordHash, connection) {
    await connection.execute('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, userId]);
    await connection.execute('UPDATE auth_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE user_id = ? AND revoked_at IS NULL', [userId]);
  }

  async audit(data, connection) {
    await connection.execute(
      `INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, before_data, after_data, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [data.actorUserId || null, data.action, data.entityType, String(data.entityId),
        data.before ? JSON.stringify(data.before) : null, data.after ? JSON.stringify(data.after) : null, data.ipAddress || null],
    );
  }

  async createNotification(data, connection = pool) {
    const [result] = await connection.execute(
      `INSERT INTO notifications
       (recipient, notification_type, related_entity_type, related_entity_id, payload, status)
       VALUES (?, ?, ?, ?, ?, 'PENDING')`,
      [data.recipient, data.type, data.entityType || null, data.entityId ? String(data.entityId) : null,
        data.payload ? JSON.stringify(data.payload) : null],
    );
    return result.insertId;
  }

  async completeNotification(id, status, errorSummary = null, connection = pool) {
    await connection.execute(
      `UPDATE notifications SET status = ?, attempt_count = attempt_count + 1,
       last_error_summary = ?, sent_at = IF(? = 'SENT', UTC_TIMESTAMP(6), sent_at) WHERE id = ?`,
      [status, errorSummary, status, id],
    );
  }
}
