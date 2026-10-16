import { describe, expect, it } from 'vitest';
import { errorMessage, fieldErrors } from './client.js';

describe('API validation errors', () => {
  const error = { response: { data: { message: 'Please correct the highlighted fields', errors: [
    { field: 'username', message: 'Use letters, numbers, dots, underscores, or hyphens' },
    { field: 'password', message: 'Password must contain at least 12 characters' },
  ] } } };

  it('shows the first concrete validation reason', () => {
    expect(errorMessage(error)).toBe('username: Use letters, numbers, dots, underscores, or hyphens');
  });

  it('maps backend validation details to their fields', () => {
    expect(fieldErrors(error)).toEqual({
      username: 'Use letters, numbers, dots, underscores, or hyphens',
      password: 'Password must contain at least 12 characters',
    });
  });
});
