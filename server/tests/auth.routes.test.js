import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { pool } from '../src/database/connection.js';

const service = {
  registerAdmin: vi.fn(async () => ({ delivery: 'SENT' })),
  requestAdminLogin: vi.fn(async () => ({ challengeId: 'ca370ef8-e5f4-4e40-9845-f12e24c9109b', expiresInMinutes: 10 })),
  verifyAdminLogin: vi.fn(async () => ({
    user: { id: 2, role: 'ADMIN' }, accessToken: 'admin-access', refreshToken: 'admin-refresh', csrfToken: 'admin-csrf',
  })),
};
const authenticate = (req, _res, next) => {
  req.user = { id: 2, role: 'ADMIN', accountRole: 'ADMIN', roles: ['ADMIN', 'AGENT'] };
  req.sessionId = 'session-id';
  next();
};
const app = createApp({ authRouter: createAuthRouter({ service, repository: { revokeAllSessions: vi.fn() }, authenticate }) });

describe('auth API contracts', () => {
  it('does not expose Agent registration or sign-in endpoints', async () => {
    await request(app).post('/api/v1/auth/register').send({}).expect(404);
    await request(app).post('/api/v1/auth/login').send({}).expect(404);
    await request(app).post('/api/v1/auth/accept-invitation').send({}).expect(404);
  });

  it('accepts one-time Admin registration details without a client-selected role', async () => {
    await request(app).post('/api/v1/auth/register-admin').send({
      fullName: 'Admin User', username: 'admin', email: 'admin@example.com',
      password: 'correct horse battery', confirmPassword: 'correct horse battery',
    }).expect(201);
    expect(service.registerAdmin).toHaveBeenCalledWith(expect.objectContaining({ email: 'admin@example.com' }), expect.any(Object));
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

});

afterAll(async () => pool.end());
