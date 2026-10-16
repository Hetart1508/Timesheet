import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { pool } from '../src/database/connection.js';

const app = createApp();

describe('foundation API', () => {
  it('reports liveness without requiring the database', async () => {
    const response = await request(app).get('/api/v1/health/live').expect(200);
    expect(response.body).toMatchObject({ success: true, data: { status: 'live' } });
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  it('returns a safe 404 response', async () => {
    const response = await request(app).get('/api/v1/does-not-exist').expect(404);
    expect(response.body).toMatchObject({ success: false, code: 'NOT_FOUND' });
    expect(response.body.requestId).toBeTruthy();
  });

  it('turns database connection failures into a safe actionable response', async () => {
    const testApp = createApp({ authRouter: (await import('express')).Router().post('/database-failure', (_req, _res, next) => {
      const error = new Error('sensitive connection details');
      error.code = 'ER_ACCESS_DENIED_ERROR';
      next(error);
    }) });
    const response = await request(testApp).post('/api/v1/auth/database-failure').expect(503);
    expect(response.body).toMatchObject({ success: false, code: 'DATABASE_UNAVAILABLE' });
    expect(response.text).not.toContain('sensitive connection details');
  });
});

afterAll(async () => {
  await pool.end();
});
