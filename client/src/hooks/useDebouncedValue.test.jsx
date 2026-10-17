import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import useDebouncedValue from './useDebouncedValue.js';

afterEach(() => { vi.useRealTimers(); });

describe('useDebouncedValue', () => {
  it('updates only after the full debounce delay and cancels stale values', () => {
    vi.useFakeTimers();
    const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value), { initialProps: { value: '' } });

    rerender({ value: 'first' });
    act(() => { vi.advanceTimersByTime(300); });
    rerender({ value: 'final' });
    act(() => { vi.advanceTimersByTime(499); });
    expect(result.current).toBe('');
    act(() => { vi.advanceTimersByTime(1); });
    expect(result.current).toBe('final');
  });
});