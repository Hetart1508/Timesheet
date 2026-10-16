import crypto from 'node:crypto';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import pinoHttp from 'pino-http';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { healthRouter } from './modules/health/health.routes.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { verifyRequestOrigin } from './middleware/csrf.js';
import { AppError } from './utils/app-error.js';
import { errorHandler, notFound } from './middleware/errors.js';

export function createApp(options = {}) {
  const app = express();
  app.disable('x-powered-by');
  if (env.TRUST_PROXY) app.set('trust proxy', 1);

  app.use((req, res, next) => {
    req.id = req.get('x-request-id')?.slice(0, 100) || crypto.randomUUID();
    res.setHeader('x-request-id', req.id);
    next();
  });
  app.use(pinoHttp({ logger, genReqId: (req) => req.id }));
  app.use(helmet());
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || env.CORS_ORIGINS.includes(origin)) return callback(null, true);
      return callback(new AppError(403, 'ORIGIN_NOT_ALLOWED', 'Request origin is not allowed'));
    },
  }));
  app.use(express.json({ limit: '256kb' }));
  app.use(express.urlencoded({ extended: false, limit: '64kb' }));
  app.use(cookieParser());
  app.use('/api/v1', verifyRequestOrigin);

  app.use('/api/v1/health', healthRouter);
  app.use('/api/v1/auth', options.authRouter || authRouter);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}
