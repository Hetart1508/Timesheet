import { describe, expect, it } from 'vitest';
import { currentBusinessDate, formatBusinessDate, formatBusinessDateTime } from './business-time.js';

describe('IST date and time helpers', () => {
  it('uses the IST calendar date when UTC is still on the previous day', () => {
    const instant = new Date('2026-10-16T20:00:00.000Z');
    expect(currentBusinessDate(instant)).toBe('2026-10-17');
    expect(formatBusinessDate('2026-10-17')).toBe('17-10-2026');
  });

  it('formats event timestamps in IST regardless of the browser timezone', () => {
    const formatted = formatBusinessDateTime('2026-10-16T20:00:00.000Z');
    expect(formatted).toContain('17-10-2026');
    expect(formatted).toMatch(/01:30|1:30/);
    expect(formatted).toContain('IST');
  });
});