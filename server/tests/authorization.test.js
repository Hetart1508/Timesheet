import { describe, expect, it, vi } from 'vitest';
import { requireRole } from '../src/middleware/authenticate.js';

describe('role authorization', () => {
  it('rejects an Agent from an Admin-only operation', () => {
    const next = vi.fn();
    requireRole('ADMIN')({ user: { role: 'AGENT' } }, {}, next);
    expect(next.mock.calls[0][0]).toMatchObject({ statusCode: 403, code: 'FORBIDDEN' });
  });

  it('permits an authenticated Admin', () => {
    const next = vi.fn();
    requireRole('ADMIN')({ user: { role: 'ADMIN' } }, {}, next);
    expect(next).toHaveBeenCalledWith();
  });
});
