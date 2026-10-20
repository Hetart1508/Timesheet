import { z } from 'zod';
import { env } from '../../config/env.js';

const password = z.string()
  .min(env.PASSWORD_MIN_LENGTH, `Password must contain at least ${env.PASSWORD_MIN_LENGTH} characters`)
  .max(128, 'Password must contain at most 128 characters');

const body = (shape) => z.object({ body: z.object(shape).strict(), params: z.object({}).optional(), query: z.object({}).optional() });

export const registrationSchema = body({
  fullName: z.string().trim().min(2).max(120),
  username: z.string().trim().min(3).max(60).regex(/^[\p{L}\p{N}._-]+$/u, 'Use letters, numbers, dots, underscores, or hyphens'),
  email: z.string().trim().email().max(254),
  password,
  confirmPassword: z.string(),
}).refine(({ body: value }) => value.password === value.confirmPassword, {
  path: ['body', 'confirmPassword'],
  message: 'Passwords do not match',
});

export const adminRegistrationSchema = registrationSchema;

export const loginSchema = body({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const adminLoginRequestSchema = body({
  email: z.string().trim().email().max(254),
  password: z.string().min(1).max(128),
});

export const adminLoginVerifySchema = body({
  challengeId: z.string().uuid(),
  email: z.string().trim().email().max(254),
  otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code'),
});

export const workspaceSchema = body({
  role: z.enum(['ADMIN', 'AGENT']),
});

export const verifyOtpSchema = body({
  email: z.string().trim().email().max(254),
  otp: z.string().regex(/^\d{6}$/, 'Enter the six-digit verification code'),
});
export const emailSchema = body({ email: z.string().trim().email().max(254) });
export const resetPasswordSchema = body({
  token: z.string().min(32).max(500),
  password,
  confirmPassword: z.string(),
}).refine(({ body: value }) => value.password === value.confirmPassword, {
  path: ['body', 'confirmPassword'],
  message: 'Passwords do not match',
});
export const acceptAgentInvitationSchema = body({
  token: z.string().min(32).max(500),
  password,
  confirmPassword: z.string(),
}).refine(({ body: value }) => value.password === value.confirmPassword, {
  path: ['body', 'confirmPassword'],
  message: 'Passwords do not match',
});
export const changePasswordSchema = body({
  currentPassword: z.string().min(1).max(128),
  password,
  confirmPassword: z.string(),
}).refine(({ body: value }) => value.password === value.confirmPassword, {
  path: ['body', 'confirmPassword'],
  message: 'Passwords do not match',
});
