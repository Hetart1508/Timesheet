import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { createTimesheetRouter } from '../src/modules/timesheets/timesheet.routes.js';

const service = { deleteDraft: vi.fn(async () => undefined) };

const app = createApp({ timesheetRouter: createTimesheetRouter({
  service,
  authenticate: (req, _res, next) => { req.user = { id: 2, role: 'AGENT' }; next(); },
}) });

const withCsrf = (requestBuilder) => requestBuilder
  .set('Cookie', 'ts_csrf=test-token')
  .set('X-CSRF-Token', 'test-token');

describe('Agent timesheet API', () => {
  it('deletes an owned draft through a CSRF-protected endpoint', async () => {
    const response = await withCsrf(request(app).delete('/api/v1/agent/timesheets/7')).expect(200);

    expect(response.body.message).toBe('Draft deleted');
    expect(service.deleteDraft).toHaveBeenCalledWith(7, 2, expect.any(Object));
  });

  it('rejects draft deletion without a matching CSRF token', async () => {
    await request(app).delete('/api/v1/agent/timesheets/7').expect(403);
  });
});
