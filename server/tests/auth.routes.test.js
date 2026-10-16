import request from 'supertest';
import { afterAll, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createAuthRouter } from '../src/modules/auth/auth.routes.js';
import { pool } from '../src/database/connection.js';

const service = {
  register: vi.fn(async () => ({ delivery: 'SENT' })),
  login: vi.fn(async () => ({
    user: { id: 1, role: 'AGENT' }, accessToken: 'access-token', refreshToken: 'refresh-token', csrfToken: 'csrf-token',
  })),
};
const app = createApp({ authRouter: createAuthRouter({ service, repository: { revokeAllSessions: vi.fn() }, authenticate: (_req, _res, next) => next() }) });

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
    const response = await request(app).post('/api/v1/auth/login').send({ identifier: 'asha', password: 'correct horse battery' }).expect(200);
    expect(response.headers['set-cookie'].join(' ')).toContain('ts_access=access-token');
    expect(response.headers['set-cookie'].join(' ')).toContain('HttpOnly');
    expect(response.body.data).toEqual({ user: { id: 1, role: 'AGENT' }, csrfToken: 'csrf-token' });
    expect(response.body.data.accessToken).toBeUndefined();
  });

  it('rejects refresh without a matching CSRF header and cookie', async () => {
    const response = await request(app).post('/api/v1/auth/refresh').expect(403);
    expect(response.body.code).toBe('CSRF_TOKEN_INVALID');
  });
});

afterAll(async () => pool.end());
