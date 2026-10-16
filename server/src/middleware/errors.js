import { AppError } from '../utils/app-error.js';
import { logger } from '../config/logger.js';

export function notFound(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} was not found`));
}

export function errorHandler(error, req, res, _next) {
  const databaseUnavailable = ['ECONNREFUSED', 'ER_ACCESS_DENIED_ERROR', 'ER_BAD_DB_ERROR', 'ER_NO_SUCH_TABLE'].includes(error?.code);
  const normalizedError = databaseUnavailable
    ? new AppError(503, 'DATABASE_UNAVAILABLE', 'The database is not configured or ready. Check the server environment and run migrations.')
    : error;
  const expected = normalizedError instanceof AppError;
  const statusCode = expected ? normalizedError.statusCode : 500;
  if (!expected) logger.error({ err: error, requestId: req.id }, 'Unhandled request error');
  if (databaseUnavailable) logger.error({ err: error, requestId: req.id }, 'Database request failed');

  res.status(statusCode).json({
    success: false,
    message: expected ? normalizedError.message : 'An unexpected error occurred',
    code: expected ? normalizedError.code : 'INTERNAL_ERROR',
    ...(expected && normalizedError.details ? { errors: normalizedError.details } : {}),
    requestId: req.id,
  });
}
