import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('retired Agent timesheet API', () => {
  it('does not expose the former Agent module', async () => {
    const response = await request(createApp()).get('/api/v1/agent/timesheets').expect(404);
    expect(response.body.code).toBe('NOT_FOUND');
  });
});
