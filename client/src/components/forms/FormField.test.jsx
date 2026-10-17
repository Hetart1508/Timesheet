import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import FormField from './FormField.jsx';

afterEach(cleanup);

describe('FormField', () => {
  it('shows and hides password values without changing the field value', () => {
    render(<FormField label="Password" name="password" type="password" value="secret passphrase" readOnly />);
    const input = screen.getByLabelText('Password');

    expect(input).toHaveAttribute('type', 'password');
    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('secret passphrase');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('does not add a visibility control to ordinary fields', () => {
    render(<FormField label="Email" name="email" type="email" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
