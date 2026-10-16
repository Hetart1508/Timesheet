import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from './connection.js';
import { logger } from '../config/logger.js';

const migrationsDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');

async function ensureMigrationTable(connection) {
  await connection.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      filename VARCHAR(255) NOT NULL,
      applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      PRIMARY KEY (id),
      UNIQUE KEY uq_schema_migrations_filename (filename)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
  `);
}

async function readMigrations() {
  const files = await fs.readdir(migrationsDirectory);
  return files.filter((file) => /^\d+.*\.sql$/.test(file)).sort();
}

async function getApplied(connection) {
  const [rows] = await connection.query('SELECT filename, applied_at FROM schema_migrations ORDER BY filename');
  return rows;
}

export async function migrate() {
  const connection = await pool.getConnection();
  try {
    await ensureMigrationTable(connection);
    const applied = new Set((await getApplied(connection)).map((row) => row.filename));
    const files = await readMigrations();
    for (const filename of files) {
      if (applied.has(filename)) continue;
      const sql = await fs.readFile(path.join(migrationsDirectory, filename), 'utf8');
      await connection.beginTransaction();
      try {
        for (const statement of sql.split(/;\s*(?:\r?\n|$)/).map((item) => item.trim()).filter(Boolean)) {
          await connection.query(statement);
        }
        await connection.query('INSERT INTO schema_migrations (filename) VALUES (?)', [filename]);
        await connection.commit();
        logger.info({ filename }, 'Migration applied');
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    }
  } finally {
    connection.release();
  }
}

export async function migrationStatus() {
  const connection = await pool.getConnection();
  try {
    await ensureMigrationTable(connection);
    const files = await readMigrations();
    const applied = new Map((await getApplied(connection)).map((row) => [row.filename, row.applied_at]));
    return files.map((filename) => ({ filename, applied: applied.has(filename), appliedAt: applied.get(filename) || null }));
  } finally {
    connection.release();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2] || 'up';
  try {
    if (command === 'up') {
      await migrate();
      logger.info('Database is up to date');
    } else if (command === 'status') {
      const status = await migrationStatus();
      for (const item of status) console.log(`${item.applied ? 'UP' : 'DOWN'}\t${item.filename}`);
    } else {
      throw new Error(`Unknown migration command: ${command}`);
    }
  } catch (error) {
    logger.error({ err: error }, 'Migration command failed');
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}
