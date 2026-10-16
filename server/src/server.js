import http from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './config/logger.js';
import { pool } from './database/connection.js';

const server = http.createServer(createApp());

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    logger.fatal({ port: env.SERVER_PORT }, 'API port is already in use. Stop the conflicting service or choose another SERVER_PORT and update API_BASE_URL.');
  } else {
    logger.fatal({ err: error }, 'API server failed to start');
  }
  process.exitCode = 1;
});

server.listen(env.SERVER_PORT, () => {
  logger.info({ port: env.SERVER_PORT, environment: env.NODE_ENV }, 'Timesheet API listening');
});

async function shutdown(signal) {
  logger.info({ signal }, 'Graceful shutdown started');
  server.close(async () => {
    await pool.end();
    logger.info('Graceful shutdown completed');
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
