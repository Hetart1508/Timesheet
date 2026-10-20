import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthRepository } from './auth.repository.js';
import { AuthService } from './auth.service.js';
import { EmailService } from '../../services/email/email.service.js';
import { createAuthenticate } from '../../middleware/authenticate.js';
import { requireCsrf } from '../../middleware/csrf.js';
import { validate } from '../../middleware/validate.js';
import { asyncHandler } from '../../utils/async-handler.js';
import { clearSessionCookies, setSessionCookies } from './cookies.js';
import {
  acceptAgentInvitationSchema, adminLoginRequestSchema, adminLoginVerifySchema, adminRegistrationSchema, changePasswordSchema, emailSchema, loginSchema, registrationSchema,
  resetPasswordSchema, verifyOtpSchema, workspaceSchema,
} from './auth.schemas.js';

const publicLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many requests. Please try again later.' },
});
const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 8,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  message: { success: false, code: 'RATE_LIMITED', message: 'Too many sign-in attempts. Please try again later.' },
});

export function createAuthRouter(options = {}) {
  const repository = options.repository || new AuthRepository();
  const emailService = options.emailService || new EmailService(repository);
  const service = options.service || new AuthService(repository, emailService);
  const authenticate = options.authenticate || createAuthenticate(repository);
  const router = Router();

  router.post('/register', publicLimiter, validate(registrationSchema), asyncHandler(async (req, res) => {
    const result = await service.register(req.validated.body, { ip: req.ip });
    res.status(201).json({ success: true, data: result, message: result.delivery === 'SENT' ? 'Registration successful. Check your email to verify the account.' : 'Registration successful, but the verification email could not be delivered. Use resend verification.' });
  }));

  router.post('/register-admin', publicLimiter, validate(adminRegistrationSchema), asyncHandler(async (req, res) => {
    const result = await service.registerAdmin(req.validated.body, { ip: req.ip });
    res.status(201).json({ success: true, data: result, message: result.delivery === 'SENT' ? 'Admin account created. Check the Admin email for the verification code.' : 'Admin account created, but the verification email could not be delivered. Use resend verification.' });
  }));

  router.post('/accept-invitation', publicLimiter, validate(acceptAgentInvitationSchema), asyncHandler(async (req, res) => {
    const result = await service.acceptAgentInvitation(req.validated.body);
    res.json({ success: true, data: result, message: 'Agent account set up successfully. You can now sign in.' });
  }));

  router.post('/verify-email', publicLimiter, validate(verifyOtpSchema), asyncHandler(async (req, res) => {
    const result = await service.verifyEmail(req.validated.body.email, req.validated.body.otp);
    res.json({ success: true, data: result, message: 'Email verified successfully' });
  }));

  router.post('/resend-verification', publicLimiter, validate(emailSchema), asyncHandler(async (req, res) => {
    await service.resendVerification(req.validated.body.email);
    res.json({ success: true, data: null, message: 'If the account is eligible, a verification email will be sent.' });
  }));

  router.post('/login', loginLimiter, validate(loginSchema), asyncHandler(async (req, res) => {
    const result = await service.login(req.validated.body, { ip: req.ip, userAgent: req.get('user-agent') });
    setSessionCookies(res, result);
    res.json({ success: true, data: { user: result.user, csrfToken: result.csrfToken }, message: 'Signed in successfully' });
  }));

  router.post('/admin-login/request', loginLimiter, validate(adminLoginRequestSchema), asyncHandler(async (req, res) => {
    const result = await service.requestAdminLogin(req.validated.body);
    res.json({ success: true, data: result, message: 'A security code was sent to the Admin email.' });
  }));

  router.post('/admin-login/verify', loginLimiter, validate(adminLoginVerifySchema), asyncHandler(async (req, res) => {
    const result = await service.verifyAdminLogin(req.validated.body, { ip: req.ip, userAgent: req.get('user-agent') });
    setSessionCookies(res, result);
    res.json({ success: true, data: { user: result.user, csrfToken: result.csrfToken }, message: 'Admin signed in successfully' });
  }));

  router.post('/refresh', requireCsrf, asyncHandler(async (req, res) => {
    const result = await service.refresh(req.cookies?.ts_refresh);
    setSessionCookies(res, result);
    res.json({ success: true, data: { user: result.user, csrfToken: result.csrfToken }, message: 'Session refreshed' });
  }));

  router.post('/logout', requireCsrf, asyncHandler(async (req, res) => {
    await service.logout(req.cookies?.ts_refresh);
    clearSessionCookies(res);
    res.json({ success: true, data: null, message: 'Signed out successfully' });
  }));

  router.post('/logout-all', authenticate, requireCsrf, asyncHandler(async (req, res) => {
    await repository.revokeAllSessions(req.user.id);
    clearSessionCookies(res);
    res.json({ success: true, data: null, message: 'All sessions have been signed out' });
  }));

  router.get('/me', authenticate, (req, res) => {
    res.json({ success: true, data: { user: req.user }, message: 'Authenticated user loaded' });
  });

  router.post('/workspace', authenticate, requireCsrf, validate(workspaceSchema), asyncHandler(async (req, res) => {
    const user = await service.switchWorkspace(req.user, req.sessionId, req.validated.body.role, { ip: req.ip });
    res.json({ success: true, data: { user }, message: `${req.validated.body.role === 'ADMIN' ? 'Admin' : 'Agent'} workspace opened` });
  }));

  router.post('/forgot-password', publicLimiter, validate(emailSchema), asyncHandler(async (req, res) => {
    await service.forgotPassword(req.validated.body.email);
    res.json({ success: true, data: null, message: 'If the account is eligible, a password-reset email will be sent.' });
  }));

  router.post('/reset-password', publicLimiter, validate(resetPasswordSchema), asyncHandler(async (req, res) => {
    await service.resetPassword(req.validated.body.token, req.validated.body.password);
    clearSessionCookies(res);
    res.json({ success: true, data: null, message: 'Password reset successfully. Sign in with your new password.' });
  }));

  router.post('/change-password', authenticate, requireCsrf, validate(changePasswordSchema), asyncHandler(async (req, res) => {
    await service.changePassword(req.user, req.validated.body.currentPassword, req.validated.body.password, { ip: req.ip });
    clearSessionCookies(res);
    res.json({ success: true, data: null, message: 'Password changed. Sign in again on every device.' });
  }));

  return router;
}

export const authRouter = createAuthRouter();
