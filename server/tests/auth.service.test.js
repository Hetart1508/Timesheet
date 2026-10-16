import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service.js';
import { hashToken } from '../src/utils/crypto.js';
import { FakeEmailService, FakeRepository, passwordEngine, verifiedAgent } from './helpers/fake-auth.js';

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

describe('login and sessions', () => {
  it('logs in using either username or email', async () => {
    verifiedAgent(repository);
    const byUsername = await service.login({ identifier: 'ASHA', password: 'correct horse battery' });
    const byEmail = await service.login({ identifier: 'ASHA@EXAMPLE.COM', password: 'correct horse battery' });
    expect(byUsername.user.username).toBe('asha');
    expect(byEmail.user.email).toBe('asha@example.com');
  });

  it('uses a generic failure for missing users and invalid passwords', async () => {
    verifiedAgent(repository);
    await expect(service.login({ identifier: 'asha', password: 'wrong' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
    await expect(service.login({ identifier: 'missing', password: 'wrong' })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('blocks unverified and inactive users', async () => {
    const user = verifiedAgent(repository, { is_email_verified: false });
    await expect(service.login({ identifier: 'asha', password: 'correct horse battery' })).rejects.toMatchObject({ code: 'EMAIL_NOT_VERIFIED' });
    user.is_email_verified = true; user.status = 'INACTIVE';
    await expect(service.login({ identifier: 'asha', password: 'correct horse battery' })).rejects.toMatchObject({ code: 'ACCOUNT_INACTIVE' });
  });

  it('rotates refresh tokens and revokes sessions when an old token is reused', async () => {
    verifiedAgent(repository);
    const login = await service.login({ identifier: 'asha', password: 'correct horse battery' });
    await service.refresh(login.refreshToken);
    await expect(service.refresh(login.refreshToken)).rejects.toMatchObject({ code: 'SESSION_REUSE_DETECTED' });
    expect([...repository.sessions.values()][0].revoked_at).toBeTruthy();
  });

  it('revokes the matching session on logout', async () => {
    verifiedAgent(repository);
    const login = await service.login({ identifier: 'asha', password: 'correct horse battery' });
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
    const login = await service.login({ identifier: 'asha', password: 'correct horse battery' });
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
