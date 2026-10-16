import { pool } from './connection.js';
import { logger } from '../config/logger.js';

// Phase 1 deliberately contains no known-password users. Phase 2 adds an explicit,
// guarded Admin bootstrap and an opt-in development seed command.
try {
  const [rows] = await pool.query('SELECT COUNT(*) AS migration_count FROM schema_migrations');
  logger.info({ migrationCount: Number(rows[0].migration_count) }, 'Schema detected; no Phase 1 business data to seed');
} catch (error) {
  logger.error({ err: error }, 'Seed check failed; run migrations first');
  process.exitCode = 1;
} finally {
  await pool.end();
}
