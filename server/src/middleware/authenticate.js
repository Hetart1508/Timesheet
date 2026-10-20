import { AuthRepository } from '../modules/auth/auth.repository.js';
import { verifyAccessToken } from '../modules/auth/token.service.js';
import { AppError } from '../utils/app-error.js';
import { asyncHandler } from '../utils/async-handler.js';

const defaultRepository = new AuthRepository();

export function createAuthenticate(repository = defaultRepository) {
  return asyncHandler(async (req, _res, next) => {
    const token = req.cookies?.ts_access;
    if (!token) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    const payload = await verifyAccessToken(token);
    const user = await repository.findAuthenticatedUser(payload.sub, payload.sid);
    if (!user || user.status !== 'ACTIVE' || !user.is_email_verified) {
      throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    }
    req.user = {
      id: Number(user.id), fullName: user.full_name, username: user.username, email: user.email,
      role: user.role, accountRole: user.account_role || user.role,
      roles: (user.account_role || user.role) === 'ADMIN' ? ['ADMIN', 'AGENT'] : ['AGENT'], status: user.status,
    };
    req.sessionId = payload.sid;
    next();
  });
}

export const authenticate = createAuthenticate();

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return next(new AppError(403, 'FORBIDDEN', 'You do not have permission to perform this action'));
  return next();
};
