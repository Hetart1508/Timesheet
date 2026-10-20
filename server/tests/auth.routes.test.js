import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { pool } from '../src/database/connection.js';

const service = {
  register: vi.fn(async () => ({ delivery: 'SENT' })),
  registerAdmin: vi.fn(async () => ({ delivery: 'SENT' })),
  acceptAgentInvitation: vi.fn(async () => ({ activated: true })),
  login: vi.fn(async () => ({
    user: { id: 1, role: 'AGENT' }, accessToken: 'access-token', refreshToken: 'refresh-token', csrfToken: 'csrf-token',
  })),
  requestAdminLogin: vi.fn(async () => ({ challengeId: 'ca370ef8-e5f4-4e40-9845-f12e24c9109b', expiresInMinutes: 10 })),
  verifyAdminLogin: vi.fn(async () => ({
    user: { id: 2, role: 'ADMIN' }, accessToken: 'admin-access', refreshToken: 'admin-refresh', csrfToken: 'admin-csrf',
  })),
  switchWorkspace: vi.fn(async (_user, _sessionId, role) => ({
    id: 2, role, accountRole: 'ADMIN', roles: ['ADMIN', 'AGENT'],
  })),
};
const authenticate = (req, _res, next) => {
  req.user = { id: 2, role: 'ADMIN', accountRole: 'ADMIN', roles: ['ADMIN', 'AGENT'] };
  req.sessionId = 'session-id';
  next();
};
const app = createApp({ authRouter: createAuthRouter({ service, repository: { revokeAllSessions: vi.fn() }, authenticate }) });

describe('auth API contracts', () => {
  it('rejects a public role field instead of trusting it', async () => {
    const response = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Asha Patel', username: 'asha', email: 'asha@example.com',
      password: 'correct horse battery', confirmPassword: 'correct horse battery', role: 'ADMIN',
    }).expect(422);
    expect(response.body.code).toBe('VALIDATION_ERROR');
    expect(service.register).not.toHaveBeenCalled();
  });

  it('sets HttpOnly session cookies and returns only user and CSRF data', async () => {
    const response = await request(app).post('/api/v1/auth/login').send({ email: 'asha@example.com', password: 'correct horse battery' }).expect(200);
    expect(response.headers['set-cookie'].join(' ')).toContain('ts_access=access-token');
    expect(response.headers['set-cookie'].join(' ')).toContain('HttpOnly');
    expect(response.body.data).toEqual({ user: { id: 1, role: 'AGENT' }, csrfToken: 'csrf-token' });
    expect(response.body.data.accessToken).toBeUndefined();
  });

  it('accepts one-time Admin registration details without a client-selected role', async () => {
    await request(app).post('/api/v1/auth/register-admin').send({
      fullName: 'Admin User', username: 'admin', email: 'admin@example.com',
      password: 'correct horse battery', confirmPassword: 'correct horse battery',
    }).expect(201);
    expect(service.registerAdmin).toHaveBeenCalledWith(expect.objectContaining({ email: 'admin@example.com' }), expect.any(Object));
  });

  it('accepts a one-time Agent setup link and validates password confirmation', async () => {
    await request(app).post('/api/v1/auth/accept-invitation').send({
      token: 'valid-agent-invitation-token-with-enough-entropy',
      password: 'a strong onboarding passphrase', confirmPassword: 'a strong onboarding passphrase',
    }).expect(200);
    expect(service.acceptAgentInvitation).toHaveBeenCalledWith(expect.objectContaining({ token: expect.any(String) }));

    await request(app).post('/api/v1/auth/accept-invitation').send({
      token: 'valid-agent-invitation-token-with-enough-entropy',
      password: 'a strong onboarding passphrase', confirmPassword: 'different strong passphrase',
    }).expect(422);
    expect(service.acceptAgentInvitation).toHaveBeenCalledTimes(1);
  });

  it('creates an Admin session only after the email code is verified', async () => {
    const requested = await request(app).post('/api/v1/auth/admin-login/request')
      .send({ email: 'admin@example.com', password: 'correct horse battery' }).expect(200);
    expect(requested.headers['set-cookie']).toBeUndefined();
    const response = await request(app).post('/api/v1/auth/admin-login/verify').send({
      challengeId: requested.body.data.challengeId, email: 'admin@example.com', otp: '123456',
    }).expect(200);
    expect(response.headers['set-cookie'].join(' ')).toContain('ts_access=admin-access');
    expect(response.body.data.user.role).toBe('ADMIN');
  });

  it('rejects refresh without a matching CSRF header and cookie', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').expect(403);
    expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
  });

  it('switches an authenticated Admin session into the Agent workspace', async () => {
    const response = await request(app).post('/api/v1/auth/workspace')
      .set('Cookie', 'ts_csrf=csrf-token').set('X-CSRF-Token', 'csrf-token')
      .send({ role: 'AGENT' }).expect(200);
    expect(service.switchWorkspace).toHaveBeenCalledWith(expect.objectContaining({ accountRole: 'ADMIN' }), 'session-id', 'AGENT', expect.any(Object));
    expect(response.body.data.user).toMatchObject({ role: 'AGENT', accountRole: 'ADMIN' });
  });
});

afterAll(async () => pool.end());
