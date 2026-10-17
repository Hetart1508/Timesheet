import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RequestState from './RequestState.jsx';

describe('RequestState', () => {
  it('announces loading status to assistive technology', () => {
    render(<RequestState label="Loading records…" onRetry={() => {}} />);
    expect(screen.getByRole('status')).toHaveTextContent('Loading records…');
  });

  it('announces a failure and invokes retry', () => {
    const onRetry = vi.fn();
    render(<RequestState error="The request failed." label="Loading records…" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }));
    expect(screen.getByRole('alert')).toHaveTextContent('The request failed.');
    expect(onRetry).toHaveBeenCalledOnce();
  });
});