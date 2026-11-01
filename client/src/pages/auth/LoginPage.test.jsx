import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import LoginPage from './LoginPage.jsx';
import AdminLoginPage from './AdminLoginPage.jsx';
import RequestEmailPage from './RequestEmailPage.jsx';
import VerifyEmailPage from './VerifyEmailPage.jsx';

const { login, requestAdminLogin, verifyAdminLogin, post } = vi.hoisted(() => ({ login: vi.fn(), requestAdminLogin: vi.fn(), verifyAdminLogin: vi.fn(), post: vi.fn() }));

vi.mock('../../context/AuthContext.jsx', () => ({
  useAuth: () => ({ user: null, login, requestAdminLogin, verifyAdminLogin }),
}));

vi.mock('../../api/client.js', () => ({
  api: { post },
  errorMessage: (error) => error.response?.data?.message || 'Something went wrong.',
  fieldErrors: () => ({}),
}));

afterEach(cleanup);
beforeEach(() => { login.mockReset(); requestAdminLogin.mockReset(); verifyAdminLogin.mockReset(); post.mockReset(); });

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
    expect(screen.queryByRole('link', { name: /admin/i })).not.toBeInTheDocument();
  });

  it('keeps Admin sign-in on its own portal without an Agent switch link', () => {
    render(<MemoryRouter><AdminLoginPage /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Timesheet' })).toHaveAttribute('href', '/login');
    expect(screen.queryByRole('link', { name: /agent sign in/i })).not.toBeInTheDocument();
  });

  it('focuses the Admin OTP field when the security-code step opens', async () => {
    requestAdminLogin.mockResolvedValueOnce({ challengeId: 'challenge-id', expiresInMinutes: 10 });
    render(<MemoryRouter><AdminLoginPage /></MemoryRouter>);
    fireEvent.change(screen.getByLabelText('Admin email'), { target: { value: 'admin@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'admin-password' } });
    fireEvent.click(screen.getByRole('button', { name: 'Continue and send code' }));
    expect(await screen.findByLabelText(/Six-digit security code/)).toHaveFocus();
  });

  it('focuses the OTP field when the standalone verification page opens', () => {
    render(<MemoryRouter initialEntries={['/verify-email?email=admin@example.com']}><VerifyEmailPage /></MemoryRouter>);
    expect(screen.getByLabelText('Six-digit code')).toHaveFocus();
  });

  it('returns Admin password recovery to the Admin portal', () => {
    render(<MemoryRouter initialEntries={['/forgot-password?portal=admin']}><RequestEmailPage mode="reset" /></MemoryRouter>);

    expect(screen.getByRole('link', { name: 'Back to sign in' })).toHaveAttribute('href', '/login/admin');
    expect(screen.getByRole('link', { name: 'Timesheet' })).toHaveAttribute('href', '/login/admin');
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
