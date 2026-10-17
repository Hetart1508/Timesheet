import { describe, expect, it } from 'vitest';
import { formatDuration, formatWorkDate, statusLabels } from './timesheets.js';

describe('timesheet presentation helpers', () => {
  it('formats durations without decimal rounding', () => {
    expect(formatDuration({ minutes: 0 })).toBe('0 min');
    expect(formatDuration({ minutes: 45 })).toBe('45 min');
    expect(formatDuration({ minutes: 120 })).toBe('2 hr');
    expect(formatDuration({ minutes: 135 })).toBe('2 hr 15 min');
  });

  it('formats a date-only value without shifting the calendar date', () => {
    const result = formatWorkDate('2026-10-17');
    expect(result).toContain('17');
    expect(result).toMatch(/2026/);
  });

  it('exposes a label for every supported status', () => {
    expect(statusLabels).toEqual(expect.objectContaining({
      DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved',
      REJECTED: 'Rejected', CHANGES_REQUESTED: 'Changes requested',
    }));
  });
});
