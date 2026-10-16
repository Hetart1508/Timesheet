import { env } from '../config/env.js';
import { AppError } from '../utils/app-error.js';
import { timingSafeEqual } from '../utils/crypto.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function verifyRequestOrigin(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get('origin');
  if (!origin) return next(); // Non-browser clients are still protected by auth/CSRF.
  if (!env.CORS_ORIGINS.includes(origin)) {
    return next(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed'));
  }
  return next();
}

export function requireCsrf(req, _res, next) {
  const cookieToken = req.cookies?.ts_csrf;
  const headerToken = req.get('x-csrf-token');
  if (!cookieToken || !headerToken || !timingSafeEqual(cookieToken, headerToken)) {
    return next(new AppError(403, 'CSRF_TOKEN_INVALID', 'The security token is missing or invalid'));
  }
  return next();
}
