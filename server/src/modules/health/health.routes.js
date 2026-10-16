import { Router } from 'express';
import { checkDatabase } from '../../database/connection.js';
import { AppError } from '../../utils/app-error.js';

export const healthRouter = Router();

healthRouter.get('/live', (_req, res) => {
  res.json({ success: true, data: { status: 'live' }, message: 'API is running' });
});

healthRouter.get('/ready', async (_req, res, next) => {
  try {
    await checkDatabase();
    res.json({ success: true, data: { status: 'ready', database: 'connected' }, message: 'API is ready' });
  } catch {
    next(new AppError(503, 'DATABASE_UNAVAILABLE', 'The database is not ready'));
  }
});
