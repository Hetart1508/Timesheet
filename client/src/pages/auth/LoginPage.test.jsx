import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import RequestEmailPage from './RequestEmailPage.jsx';
import VerifyEmailPage from './VerifyEmailPage.jsx';

const { login, post } = vi.hoisted(() => ({ login: vi.fn(), post: vi.fn() }));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: null, login }),
}));

vi.mock('../../api/client.js', () => ({
  api: { post },
  errorMessage: (error) => error.response?.data?.message || 'Something went wrong.',
  fieldErrors: () => ({}),
}));

afterEach(cleanup);
beforeEach(() => { login.mockReset(); post.mockReset(); });

function renderAuthFlow() {
  return render(<MemoryRouter initialEntries={['/login/agent']}><Routes>
    <Route path="/login/agent" element={<LoginPage />} />
    <Route path="/resend-verification" element={<RequestEmailPage mode="verification" />} />
    <Route path="/verify-email" element={<VerifyEmailPage />} />
  </Routes></MemoryRouter>);
}

describe('Agent sign-in verification flow', () => {
  it('keeps verification actions hidden during normal sign-in', () => {
    renderAuthFlow();

    expect(screen.getByRole('link', { name: 'Forgot password?' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /verify email|resend code|verification/i })).not.toBeInTheDocument();
  });

  it('shows verification steps only after an unverified sign-in attempt', async () => {
    const email = 'agent@example.com';
    login.mockRejectedValueOnce({ response: { data: { code: 'EMAIL_NOT_VERIFIED', message: 'Verify your email before signing in.' } } });
    post.mockResolvedValueOnce({ data: { message: 'If the account is eligible, a verification email will be sent.' } });
    renderAuthFlow();

    fireEvent.change(screen.getByLabelText('Agent email'), { target: { value: email } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'agent-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in as Agent' }));

    fireEvent.click(await screen.findByRole('link', { name: 'Continue to email verification' }));
    expect(await screen.findByLabelText('Email address')).toHaveValue(email);
    fireEvent.click(screen.getByRole('button', { name: 'Send verification code' }));

    fireEvent.click(await screen.findByRole('link', { name: 'Enter verification code' }));
    expect(await screen.findByRole('heading', { name: 'Enter your verification code' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email address')).toHaveValue(email);
  });
});