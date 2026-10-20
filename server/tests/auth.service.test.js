import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashToken } from '../src/utils/crypto.js';
import { FakeEmailService, FakeRepository, passwordEngine, verifiedAdmin, verifiedAgent } from './helpers/fake-auth.js';

let repository;
let email;
let service;

beforeEach(() => {
  repository = new FakeRepository();
  email = new FakeEmailService();
  service = new AuthService(repository, email, passwordEngine);
});

const registration = {
  fullName: 'Asha Patel', username: 'Asha.P', email: 'ASHA@example.com',
  password: 'correct horse battery', confirmPassword: 'correct horse battery', role: 'ADMIN',
};

describe('registration and verification', () => {
  it('always creates an unverified Agent and sends a single-use token', async () => {
    await service.register(registration, { ip: '127.0.0.1' });
    expect(repository.users[0]).toMatchObject({ role: 'AGENT', email_normalized: 'asha@example.com', is_email_verified: false });
    expect(email.sent[0].type).toBe('verification');
    await service.verifyEmail('asha@example.com', email.sent[0].token);
    expect(repository.users[0].is_email_verified).toBe(true);
    await expect(service.verifyEmail('asha@example.com', email.sent[0].token)).rejects.toMatchObject({ code: 'VERIFICATION_OTP_INVALID' });
  });

  it('rejects duplicate username or email with one generic conflict', async () => {
    await service.register(registration);
    await expect(service.register({ ...registration, username: 'different' })).rejects.toMatchObject({ code: 'ACCOUNT_DETAILS_IN_USE' });
    await expect(service.register({ ...registration, email: 'different@example.com' })).rejects.toMatchObject({ code: 'ACCOUNT_DETAILS_IN_USE' });
  });

  it('creates only one unverified Admin and requires email verification', async () => {
    const adminRegistration = { ...registration, username: 'admin', email: 'admin@example.com' };
    const result = await service.registerAdmin(adminRegistration, { ip: '127.0.0.1' });
    expect(result.delivery).toBe('SENT');
    expect(repository.users[0]).toMatchObject({ role: 'ADMIN', is_email_verified: false });
    expect(email.sent[0].type).toBe('verification');
    await expect(service.requestAdminLogin({ email: 'admin@example.com', password: adminRegistration.password }))
      .rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    const verification = await service.verifyEmail('admin@example.com', email.sent[0].token);
    expect(verification).toMatchObject({ verified: true, role: 'ADMIN' });
  });

  it('refuses to register a second Admin account', async () => {
    await service.registerAdmin({ ...registration, username: 'admin', email: 'admin@example.com' });
    await expect(service.registerAdmin({ ...registration, username: 'admin2', email: 'admin2@example.com' }))
      .rejects.toMatchObject({ code: 'ADMIN_ALREADY_EXISTS' });
    expect(repository.users.filter((user) => user.role === 'ADMIN')).toHaveLength(1);
  });

  it('rejects expired verification tokens', async () => {
    await service.register(registration);
    const raw = email.sent[0].token;
    repository.verificationTokens.get(hashToken(raw)).expiresAt = new Date(0);
    await expect(service.verifyEmail('asha@example.com', raw)).rejects.toMatchObject({ code: 'VERIFICATION_OTP_INVALID' });
  });

  it('locks a verification code after repeated incorrect attempts', async () => {
    await service.register(registration);
    const correctOtp = email.sent[0].token;
    const incorrectOtp = correctOtp === '000000' ? '999999' : '000000';
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.verifyEmail('asha@example.com', incorrectOtp)).rejects.toMatchObject({ code: 'VERIFICATION_OTP_INVALID' });
    }
    await expect(service.verifyEmail('asha@example.com', correctOtp)).rejects.toMatchObject({ code: 'VERIFICATION_OTP_INVALID' });
  });
});

describe('Agent invitation acceptance', () => {
  it('creates a verified Agent with the chosen password and consumes the link once', async () => {
    const rawToken = 'one-time-agent-invitation-token-with-enough-entropy';
    repository.agentInvitations.set(1, {
      id: 1, full_name: 'Asha Patel', email: 'asha@example.com', email_normalized: 'asha@example.com',
      tokenHash: hashToken(rawToken), expiresAt: new Date(Date.now() + 60_000), status: 'SENT',
    });

    await expect(service.acceptAgentInvitation({ token: rawToken, password: 'a strong onboarding passphrase' }))
      .resolves.toEqual({ activated: true });

    expect(repository.users[0]).toMatchObject({
      full_name: 'Asha Patel', email: 'asha@example.com', role: 'AGENT', is_email_verified: true,
      password_hash: 'hash:a strong onboarding passphrase',
    });
    expect(repository.users[0].username).toMatch(/^asha\.patel-[a-f0-9]{24}$/);
    expect(repository.agentInvitations.get(1)).toMatchObject({ status: 'ACCEPTED', acceptedUserId: 1, tokenHash: null });
    expect(email.sent.at(-1).type).toBe('welcome');
    await expect(service.acceptAgentInvitation({ token: rawToken, password: 'another strong passphrase' }))
      .rejects.toMatchObject({ code: 'AGENT_INVITATION_INVALID' });
  });

  it('rejects expired or unknown invitation links', async () => {
    const rawToken = 'expired-agent-invitation-token-with-enough-entropy';
    repository.agentInvitations.set(1, {
      id: 1, full_name: 'Asha Patel', email: 'asha@example.com', email_normalized: 'asha@example.com',
      tokenHash: hashToken(rawToken), expiresAt: new Date(0), status: 'SENT',
    });
    await expect(service.acceptAgentInvitation({ token: rawToken, password: 'a strong onboarding passphrase' }))
      .rejects.toMatchObject({ code: 'AGENT_INVITATION_INVALID' });
  });
});

describe('login and sessions', () => {
  it('logs an Agent in using a verified email and password', async () => {
    verifiedAgent(repository);
    const byEmail = await service.login(
      { email: 'ASHA@EXAMPLE.COM', password: 'correct horse battery' },
      { ip: '::ffff:192.0.2.7' },
    );
    expect(byEmail.user.email).toBe('asha@example.com');
    expect([...repository.sessions.values()][0].ipAddress).toBe('192.0.2.7');
  });

  it('uses a generic failure for missing users and invalid passwords', async () => {
    verifiedAgent(repository);
    await expect(service.login({ email: 'asha@example.com', password: 'wrong' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(service.login({ email: 'missing@example.com', password: 'wrong' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('blocks unverified and inactive users', async () => {
    const user = verifiedAgent(repository, { is_email_verified: false });
    await expect(service.login({ email: 'asha@example.com', password: 'correct horse battery' })).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    user.is_email_verified = true; user.status = 'INACTIVE';
    await expect(service.login({ email: 'asha@example.com', password: 'correct horse battery' })).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE' });
  });

  it('does not allow an Admin account through Agent login', async () => {
    verifiedAdmin(repository);
    await expect(service.login({ email: 'admin@example.com', password: 'correct horse battery' }))
      .rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    expect(repository.sessions.size).toBe(0);
  });

  it('requires a valid one-time email code before creating an Admin session', async () => {
    verifiedAdmin(repository);
    const challenge = await service.requestAdminLogin({ email: 'ADMIN@example.com', password: 'correct horse battery' });
    expect(repository.sessions.size).toBe(0);
    expect(email.sent.at(-1).type).toBe('admin-login');
    const result = await service.verifyAdminLogin({
      challengeId: challenge.challengeId, email: 'admin@example.com', otp: email.sent.at(-1).token,
    });
    expect(result.user).toMatchObject({ role: 'ADMIN', email: 'admin@example.com' });
    expect(repository.sessions.size).toBe(1);
    expect([...repository.sessions.values()][0].activeRole).toBe('ADMIN');
    await expect(service.verifyAdminLogin({
      challengeId: challenge.challengeId, email: 'admin@example.com', otp: email.sent.at(-1).token,
    })).rejects.toMatchObject({ code: 'ADMIN_OTP_INVALID' });
  });

  it('lets an MFA-authenticated Admin switch to Agent workspace and back', async () => {
    verifiedAdmin(repository);
    const challenge = await service.requestAdminLogin({ email: 'admin@example.com', password: 'correct horse battery' });
    const login = await service.verifyAdminLogin({
      challengeId: challenge.challengeId, email: 'admin@example.com', otp: email.sent.at(-1).token,
    });
    const sessionId = [...repository.sessions.keys()][0];
    const agentUser = await service.switchWorkspace(login.user, sessionId, 'AGENT', { ip: '127.0.0.1' });
    expect(agentUser).toMatchObject({ role: 'AGENT', accountRole: 'ADMIN', roles: ['ADMIN', 'AGENT'] });
    expect(repository.findAuthenticatedUser(login.user.id, sessionId).role).toBe('AGENT');

    const adminUser = await service.switchWorkspace(agentUser, sessionId, 'ADMIN', { ip: '127.0.0.1' });
    expect(adminUser.role).toBe('ADMIN');
    expect(repository.audits.filter((item) => item.action === 'WORKSPACE_SWITCHED')).toHaveLength(2);
  });

  it('does not let an Agent enter the Admin workspace', async () => {
    verifiedAgent(repository);
    const login = await service.login({ email: 'asha@example.com', password: 'correct horse battery' });
    const sessionId = [...repository.sessions.keys()][0];
    await expect(service.switchWorkspace(login.user, sessionId, 'ADMIN'))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('does not allow an Agent account to start Admin login', async () => {
    verifiedAgent(repository);
    await expect(service.requestAdminLogin({ email: 'asha@example.com', password: 'correct horse battery' }))
      .rejects.toMatchObject({ code: 'INVALID_ADMIN_CREDENTIALS' });
    expect(email.sent).toHaveLength(0);
  });

  it('rejects incorrect and expired Admin login codes', async () => {
    verifiedAdmin(repository);
    const first = await service.requestAdminLogin({ email: 'admin@example.com', password: 'correct horse battery' });
    await expect(service.verifyAdminLogin({ challengeId: first.challengeId, email: 'admin@example.com', otp: '000000' }))
      .rejects.toMatchObject({ code: 'ADMIN_OTP_INVALID' });
    const second = await service.requestAdminLogin({ email: 'admin@example.com', password: 'correct horse battery' });
    repository.adminLoginChallenges.get(second.challengeId).expiresAt = new Date(0);
    await expect(service.verifyAdminLogin({ challengeId: second.challengeId, email: 'admin@example.com', otp: email.sent.at(-1).token }))
      .rejects.toMatchObject({ code: 'ADMIN_OTP_INVALID' });
  });

  it('rotates refresh tokens and revokes sessions when an old token is reused', async () => {
    verifiedAgent(repository);
    const login = await service.login({ email: 'asha@example.com', password: 'correct horse battery' });
    await service.refresh(login.refreshToken);
    await expect(service.refresh(login.refreshToken)).rejects.toMatchObject({ code: 'SESSION_REUSE_DETECTED' });
    expect([...repository.sessions.values()][0].revoked_at).toBeTruthy();
  });

  it('revokes the matching session on logout', async () => {
    verifiedAgent(repository);
    const login = await service.login({ email: 'asha@example.com', password: 'correct horse battery' });
    await service.logout(login.refreshToken);
    expect([...repository.sessions.values()][0].revoked_at).toBeTruthy();
  });
});

describe('password recovery', () => {
  it('does not reveal missing accounts and sends reset mail for eligible users', async () => {
    await expect(service.forgotPassword('missing@example.com')).resolves.toBeUndefined();
    verifiedAgent(repository);
    await service.forgotPassword('asha@example.com');
    expect(email.sent.at(-1).type).toBe('reset');
  });

  it('resets once, revokes sessions, and rejects token reuse', async () => {
    verifiedAgent(repository);
    const login = await service.login({ email: 'asha@example.com', password: 'correct horse battery' });
    await service.forgotPassword('asha@example.com');
    const raw = email.sent.at(-1).token;
    await service.resetPassword(raw, 'a much newer passphrase');
    expect(repository.findUserById(1).password_hash).toBe('hash:a much newer passphrase');
    expect([...repository.sessions.values()][0].revoked_at).toBeTruthy();
    await expect(service.resetPassword(raw, 'another valid passphrase')).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' });
    expect(login.accessToken).toBeTruthy();
  });

  it('rejects expired reset tokens', async () => {
    verifiedAgent(repository);
    await service.forgotPassword('asha@example.com');
    const raw = email.sent.at(-1).token;
    repository.resetTokens.get(hashToken(raw)).expiresAt = new Date(0);
    await expect(service.resetPassword(raw, 'another valid passphrase')).rejects.toMatchObject({ code: 'RESET_TOKEN_INVALID' });
  });
});
