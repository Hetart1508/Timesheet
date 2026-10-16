import argon2 from 'argon2';
import { env } from '../config/env.js';
import { AuthRepository } from '../modules/auth/auth.repository.js';
import { normalizeEmail, normalizeName, normalizeUsername } from '../utils/normalize.js';
import { pool } from '../database/connection.js';
import { logger } from '../config/logger.js';

const required = ['ADMIN_FULL_NAME', 'ADMIN_USERNAME', 'ADMIN_EMAIL', 'ADMIN_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);

try {
  if (missing.length) throw new Error(`Missing required variables: ${missing.join(', ')}`);
  if (process.env.ADMIN_PASSWORD.length < env.PASSWORD_MIN_LENGTH || process.env.ADMIN_PASSWORD.length > 128) {
    throw new Error(`ADMIN_PASSWORD must contain ${env.PASSWORD_MIN_LENGTH}-128 characters`);
  }
  const repository = new AuthRepository();
  if (await repository.countAdmins()) throw new Error('Bootstrap refused: an Admin account already exists');
  const id = await repository.transaction(async (connection) => {
    const userId = await repository.createUser({
      fullName: normalizeName(process.env.ADMIN_FULL_NAME),
      username: process.env.ADMIN_USERNAME.normalize('NFKC').trim(),
      usernameNormalized: normalizeUsername(process.env.ADMIN_USERNAME),
      email: normalizeEmail(process.env.ADMIN_EMAIL),
      emailNormalized: normalizeEmail(process.env.ADMIN_EMAIL),
      passwordHash: await argon2.hash(process.env.ADMIN_PASSWORD, { type: argon2.argon2id }),
      role: 'ADMIN', emailVerified: true,
    }, connection);
    await repository.audit({ actorUserId: userId, action: 'ADMIN_BOOTSTRAPPED', entityType: 'USER', entityId: userId, after: { role: 'ADMIN' } }, connection);
    return userId;
  });
  logger.info({ userId: id }, 'Initial Admin account created');
} catch (error) {
  logger.error({ err: error }, 'Admin bootstrap failed');
  process.exitCode = 1;
} finally {
  await pool.end();
}
