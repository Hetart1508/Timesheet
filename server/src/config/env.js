import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../..');
dotenv.config({ path: path.join(root, '.env') });
dotenv.config({ path: path.join(root, 'server/.env'), override: true });

const booleanValue = z
  .enum(['true', 'false'])
  .default('false')
  .transform((value) => value === 'true');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  SERVER_PORT: z.coerce.number().int().min(1).max(65535).default(5001),
  APP_BASE_URL: z.url().default('http://localhost:5173'),
  API_BASE_URL: z.url().default('http://localhost:5001'),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),
  TRUST_PROXY: booleanValue,
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().min(1).max(65535).default(3306),
  DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/).default('timesheet_management'),
  TEST_DB_NAME: z.string().regex(/^[a-zA-Z0-9_]+$/).default('timesheet_management_test'),
  DB_USER: z.string().min(1).default('timesheet_app'),
  DB_PASSWORD: z.string().default(''),
  DB_CONNECTION_LIMIT: z.coerce.number().int().min(1).max(50).default(10),
  DB_SSL: booleanValue,
  BUSINESS_TIMEZONE: z.string().default('Asia/Kolkata'),
  APPROVAL_REQUIRED: z.enum(['true', 'false']).default('true').transform((value) => value === 'true'),
  JWT_ACCESS_SECRET: z.string().min(32).default('development-only-secret-change-me-now'),
  JWT_ISSUER: z.string().default('timesheet-management'),
  JWT_AUDIENCE: z.string().default('timesheet-web'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().min(5).max(60).default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(30).default(7),
  COOKIE_SECURE: booleanValue,
  COOKIE_DOMAIN: z.string().optional(),
  PASSWORD_MIN_LENGTH: z.coerce.number().int().min(12).max(64).default(12),
  EMAIL_OTP_TTL_MINUTES: z.coerce.number().int().min(5).max(30).default(10),
  EMAIL_OTP_MAX_ATTEMPTS: z.coerce.number().int().min(3).max(10).default(5),
  DEV_EMAIL_MODE: z.enum(['true', 'false']).default('false').transform((value) => value === 'true'),
  BREVO_API_KEY: z.string().optional(),
  BREVO_SENDER_NAME: z.string().default('Timesheet Management'),
  BREVO_SENDER_EMAIL: z.string().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
  throw new Error(`Invalid environment configuration: ${details}`);
}

if (parsed.data.NODE_ENV === 'production') {
  if (parsed.data.JWT_ACCESS_SECRET.startsWith('development-only')) {
    throw new Error('JWT_ACCESS_SECRET must be replaced in production');
  }
  if (parsed.data.DEV_EMAIL_MODE) {
    throw new Error('DEV_EMAIL_MODE cannot be enabled in production');
  }
  if (!parsed.data.COOKIE_SECURE) {
    throw new Error('COOKIE_SECURE must be true in production');
  }
}

export const env = Object.freeze({
  ...parsed.data,
  CORS_ORIGINS: parsed.data.CORS_ORIGINS.split(',').map((origin) => origin.trim()).filter(Boolean),
  DB_NAME: parsed.data.NODE_ENV === 'test' ? parsed.data.TEST_DB_NAME : parsed.data.DB_NAME,
});
