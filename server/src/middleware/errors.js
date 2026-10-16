import { AppError } from '../utils/app-error.js';
import { logger } from '../config/logger.js';

export function notFound(req, _res, next) {
  next(new AppError(404, 'NOT_FOUND', `Route ${req.method} ${req.path} was not found`));
}

export function errorHandler(error, req, res, _next) {
  const expected = error instanceof AppError;
  const statusCode = expected ? error.statusCode : 500;
  if (!expected) logger.error({ err: error, requestId: req.id }, 'Unhandled request error');

  res.status(statusCode).json({
    success: false,
    message: expected ? error.message : 'An unexpected error occurred',
    code: expected ? error.code : 'INTERNAL_ERROR',
    ...(expected && error.details ? { errors: error.details } : {}),
    requestId: req.id,
  });
}
