export const passwordEngine = {
  hash: async (password) => `hash:${password}`,
  verify: async (hash, password) => hash === `hash:${password}`,
};

export class FakeRepository {
  constructor() {
    this.users = [];
    this.verificationTokens = new Map();
    this.adminLoginChallenges = new Map();
    this.resetTokens = new Map();
    this.agentInvitations = new Map();
    this.sessions = new Map();
    this.notifications = [];
    this.audits = [];
  }

  transaction(work) { return work(this); }
  findIdentity(identifier) { return this.users.find((user) => user.username_normalized === identifier || user.email_normalized === identifier) || null; }
  findUserByEmail(email) { return this.users.find((user) => user.email_normalized === email) || null; }
  findUserById(id) { return this.users.find((user) => user.id === Number(id)) || null; }
  findAuthenticatedUser(userId, sessionId) {
    const session = this.sessions.get(sessionId);
    return session && !session.revoked_at && session.userId === Number(userId) ? this.findUserById(userId) : null;
  }

  createAgent(data) { return this.createUser({ ...data, role: 'AGENT', emailVerified: false }); }
  createInvitedAgent(data) { return this.createUser({ ...data, role: 'AGENT', emailVerified: true }); }
  createUser(data) {
    if (this.users.some((user) => user.username_normalized === data.usernameNormalized || user.email_normalized === data.emailNormalized)) {
      const error = new Error('Duplicate'); error.code = 'ER_DUP_ENTRY'; throw error;
    }
    const id = this.users.length + 1;
    this.users.push({
      id, full_name: data.fullName, username: data.username, username_normalized: data.usernameNormalized,
      email: data.email, email_normalized: data.emailNormalized, password_hash: data.passwordHash,
      role: data.role, is_email_verified: data.emailVerified, status: 'ACTIVE',
    });
    return id;
  }

  countAdmins() { return this.users.filter((user) => user.role === 'ADMIN').length; }
  findAgentInvitationByToken(tokenHash) {
    const invitation = [...this.agentInvitations.values()].find((item) => item.tokenHash === tokenHash);
    return invitation && invitation.status !== 'ACCEPTED' && invitation.expiresAt > new Date() ? invitation : null;
  }
  consumeAgentInvitation(id, userId) {
    const invitation = this.agentInvitations.get(Number(id));
    invitation.status = 'ACCEPTED'; invitation.acceptedUserId = userId; invitation.tokenHash = null;
  }
  replaceVerificationToken(userId, tokenHash, expiresAt) {
    for (const [key, token] of this.verificationTokens) if (token.userId === userId && !token.consumed) this.verificationTokens.delete(key);
    this.verificationTokens.set(tokenHash, { userId, expiresAt, consumed: false, attempts: 0 });
  }
  consumeVerificationOtp(email, tokenHash, maxAttempts) {
    const user = this.findUserByEmail(email);
    const entry = [...this.verificationTokens.entries()].find(([, token]) => token.userId === user?.id);
    const token = entry?.[1];
    if (!token) return null;
    if (token.consumed || token.expiresAt <= new Date() || token.attempts >= maxAttempts) return { invalid: true };
    if (entry[0] !== tokenHash) { token.attempts += 1; if (token.attempts >= maxAttempts) token.consumed = true; return { invalid: true }; }
    token.consumed = true;
    user.is_email_verified = true;
    return { user_id: user.id, email: user.email, full_name: user.full_name, role: user.role };
  }

  replaceAdminLoginChallenge(id, userId, tokenHash, expiresAt) {
    for (const [key, challenge] of this.adminLoginChallenges) {
      if (challenge.userId === userId && !challenge.consumed) this.adminLoginChallenges.delete(key);
    }
    this.adminLoginChallenges.set(id, { id, userId, tokenHash, expiresAt, consumed: false, attempts: 0 });
  }
  consumeAdminLoginOtp(challengeId, email, tokenHash, maxAttempts) {
    const challenge = this.adminLoginChallenges.get(challengeId);
    const user = challenge ? this.findUserById(challenge.userId) : null;
    if (!challenge || user?.email_normalized !== email || challenge.consumed || challenge.expiresAt <= new Date()
      || challenge.attempts >= maxAttempts || user?.role !== 'ADMIN' || !user?.is_email_verified || user?.status !== 'ACTIVE') return { invalid: true };
    if (challenge.tokenHash !== tokenHash) {
      challenge.attempts += 1;
      if (challenge.attempts >= maxAttempts) challenge.consumed = true;
      return { invalid: true };
    }
    challenge.consumed = true;
    return { ...user, user_id: user.id };
  }

  replaceResetToken(userId, tokenHash, expiresAt) { this.resetTokens.set(tokenHash, { userId, expiresAt, consumed: false }); }
  consumeResetToken(tokenHash, passwordHash) {
    const token = this.resetTokens.get(tokenHash);
    if (!token || token.consumed || token.expiresAt <= new Date()) return null;
    token.consumed = true;
    const user = this.findUserById(token.userId);
    user.password_hash = passwordHash;
    this.revokeAllSessions(user.id);
    return { user_id: user.id, email: user.email, full_name: user.full_name };
  }

  createSession(data) { this.sessions.set(data.id, { ...data, refresh_token_hash: data.refreshTokenHash, previous_token_hash: null, revoked_at: null }); }
  rotateSession(currentHash, nextHash) {
    const session = [...this.sessions.values()].find((item) => item.refresh_token_hash === currentHash || item.previous_token_hash === currentHash);
    if (!session) return null;
    if (session.previous_token_hash === currentHash) { this.revokeAllSessions(session.userId); return { reused: true }; }
    if (session.revoked_at || session.expiresAt <= new Date()) return null;
    session.previous_token_hash = session.refresh_token_hash;
    session.refresh_token_hash = nextHash;
    const user = this.findUserById(session.userId);
    return { ...user, id: user.id, user_id: user.id, session_id: session.id };
  }
  revokeSessionByToken(hash) { for (const session of this.sessions.values()) if (session.refresh_token_hash === hash) session.revoked_at = new Date(); }
  revokeAllSessions(userId) { for (const session of this.sessions.values()) if (session.userId === Number(userId)) session.revoked_at = new Date(); }
  touchLogin() {}
  updatePassword(userId, hash) { this.findUserById(userId).password_hash = hash; this.revokeAllSessions(userId); }
  audit(data) { this.audits.push(data); }
  createNotification(data) { this.notifications.push({ ...data, status: 'PENDING' }); return this.notifications.length; }
  completeNotification(id, status) { this.notifications[id - 1].status = status; }
}

export class FakeEmailService {
  constructor() { this.sent = []; }
  sendVerification(user, token) { this.sent.push({ type: 'verification', user, token }); return { delivered: true }; }
  sendAdminLoginOtp(user, token) { this.sent.push({ type: 'admin-login', user, token }); return { delivered: true }; }
  sendWelcome(user) { this.sent.push({ type: 'welcome', user }); return { delivered: true }; }
  sendPasswordReset(user, token) { this.sent.push({ type: 'reset', user, token }); return { delivered: true }; }
  sendPasswordChanged(user) { this.sent.push({ type: 'changed', user }); return { delivered: true }; }
}

export function verifiedAdmin(repository, overrides = {}) {
  const id = repository.createUser({
    fullName: 'Admin User', username: 'admin', usernameNormalized: 'admin',
    email: 'admin@example.com', emailNormalized: 'admin@example.com',
    passwordHash: 'hash:correct horse battery', role: 'ADMIN', emailVerified: true,
  });
  Object.assign(repository.findUserById(id), overrides);
  return repository.findUserById(id);
}

export function verifiedAgent(repository, overrides = {}) {
  const id = repository.createUser({
    fullName: 'Asha Patel', username: 'asha', usernameNormalized: 'asha',
    email: 'asha@example.com', emailNormalized: 'asha@example.com',
    passwordHash: 'hash:correct horse battery', role: 'AGENT', emailVerified: true,
  });
  Object.assign(repository.findUserById(id), overrides);
  return repository.findUserById(id);
}
