import crypto from 'node:crypto';
import argon2 from 'argon2';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';
import { hashToken, randomOtp, randomToken } from '../../utils/crypto.js';
import { normalizeEmail, normalizeName, normalizeUsername } from '../../utils/normalize.js';
import { signAccessToken } from './token.service.js';

const commonPasswords = new Set(['password1234', '123456789012', 'qwertyuiop12', 'adminpassword', 'letmein123456']);
const expiresIn = (milliseconds) => new Date(Date.now() + milliseconds);
const publicUser = (user) => ({
  id: Number(user.id), fullName: user.full_name, username: user.username, email: user.email,
  role: user.role, emailVerified: Boolean(user.is_email_verified), status: user.status,
});

export class AuthService {
  constructor(repository, emailService, passwordEngine = argon2) {
    this.repository = repository;
    this.emailService = emailService;
    this.passwordEngine = passwordEngine;
  }

  validatePassword(password) {
    if (commonPasswords.has(password.toLowerCase())) {
      throw new AppError(422, 'WEAK_PASSWORD', 'Choose a less common password', [{ field: 'password', message: 'This password is too common' }]);
    }
  }

  async register(input, request = {}) {
    this.validatePassword(input.password);
    const values = {
      fullName: normalizeName(input.fullName), username: input.username.normalize('NFKC').trim(),
      usernameNormalized: normalizeUsername(input.username), email: normalizeEmail(input.email),
      emailNormalized: normalizeEmail(input.email),
      passwordHash: await this.passwordEngine.hash(input.password, { type: argon2.argon2id }),
    };
    const otp = randomOtp();
    let userId;
    try {
      userId = await this.repository.transaction(async (connection) => {
        const id = await this.repository.createAgent(values, connection);
        await this.repository.replaceVerificationToken(id, hashToken(otp), expiresIn(env.EMAIL_OTP_TTL_MINUTES * 60_000), connection);
        await this.repository.audit({ actorUserId: id, action: 'USER_REGISTERED', entityType: 'USER', entityId: id, after: { role: 'AGENT', emailVerified: false }, ipAddress: request.ip }, connection);
        return id;
      });
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') throw new AppError(409, 'ACCOUNT_DETAILS_IN_USE', 'An account already uses those details');
      throw error;
    }
    const delivery = await this.emailService.sendVerification({ id: userId, email: values.email, fullName: values.fullName }, otp);
    return { delivery: delivery.delivered ? 'SENT' : 'FAILED' };
  }

  async registerAdmin(input, request = {}) {
    this.validatePassword(input.password);
    const values = {
      fullName: normalizeName(input.fullName), username: input.username.normalize('NFKC').trim(),
      usernameNormalized: normalizeUsername(input.username), email: normalizeEmail(input.email),
      emailNormalized: normalizeEmail(input.email),
      passwordHash: await this.passwordEngine.hash(input.password, { type: argon2.argon2id }),
      role: 'ADMIN', emailVerified: false,
    };
    const otp = randomOtp();
    let userId;
    try {
      userId = await this.repository.transaction(async (connection) => {
        if (await this.repository.countAdmins(connection)) {
          throw new AppError(409, 'ADMIN_ALREADY_EXISTS', 'The Admin account has already been created');
        }
        const id = await this.repository.createUser(values, connection);
        await this.repository.replaceVerificationToken(id, hashToken(otp), expiresIn(env.EMAIL_OTP_TTL_MINUTES * 60_000), connection);
        await this.repository.audit({ actorUserId: id, action: 'ADMIN_REGISTERED', entityType: 'USER', entityId: id, after: { role: 'ADMIN', emailVerified: false }, ipAddress: request.ip }, connection);
        return id;
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      if (error?.code === 'ER_DUP_ENTRY') {
        if (await this.repository.countAdmins()) throw new AppError(409, 'ADMIN_ALREADY_EXISTS', 'The Admin account has already been created');
        throw new AppError(409, 'ACCOUNT_DETAILS_IN_USE', 'An account already uses those details');
      }
      throw error;
    }
    const delivery = await this.emailService.sendVerification({ id: userId, email: values.email, fullName: values.fullName }, otp);
    return { delivery: delivery.delivered ? 'SENT' : 'FAILED' };
  }

  async verifyEmail(email, otp) {
    const verified = await this.repository.transaction((connection) => this.repository.consumeVerificationOtp(
      normalizeEmail(email), hashToken(otp), env.EMAIL_OTP_MAX_ATTEMPTS, connection,
    ));
    if (!verified || verified.invalid) throw new AppError(400, 'VERIFICATION_OTP_INVALID', 'The verification code is invalid or expired');
    await this.emailService.sendWelcome({ id: verified.user_id, email: verified.email, fullName: verified.full_name, role: verified.role });
    return { verified: true, role: verified.role };
  }

  async resendVerification(email) {
    const normalized = normalizeEmail(email);
    const user = await this.repository.findUserByEmail(normalized);
    if (user && !user.is_email_verified && user.status === 'ACTIVE') {
      const otp = randomOtp();
      await this.repository.transaction((connection) => this.repository.replaceVerificationToken(user.id, hashToken(otp), expiresIn(env.EMAIL_OTP_TTL_MINUTES * 60_000), connection));
      await this.emailService.sendVerification({ id: user.id, email: user.email, fullName: user.full_name }, otp);
    }
  }

  async login(input, request = {}) {
    const user = await this.repository.findUserByEmail(normalizeEmail(input.email));
    const valid = user && await this.passwordEngine.verify(user.password_hash, input.password);
    if (!valid || user.role !== 'AGENT') throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid Agent email or password');
    if (!user.is_email_verified) throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify your email before signing in');
    if (user.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_INACTIVE', 'This account is inactive');

    const sessionId = crypto.randomUUID();
    const refreshToken = randomToken(48);
    await this.repository.createSession({
      id: sessionId, userId: user.id, refreshTokenHash: hashToken(refreshToken),
      expiresAt: expiresIn(env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
      ipAddress: request.ip, userAgent: request.userAgent?.slice(0, 255),
    });
    await this.repository.touchLogin(user.id);
    return {
      user: publicUser(user), accessToken: await signAccessToken(user, sessionId),
      refreshToken, csrfToken: randomToken(),
    };
  }

  async requestAdminLogin(input) {
    const email = normalizeEmail(input.email);
    const user = await this.repository.findUserByEmail(email);
    const valid = user && await this.passwordEngine.verify(user.password_hash, input.password);
    if (!valid || user.role !== 'ADMIN') {
      throw new AppError(401, 'INVALID_ADMIN_CREDENTIALS', 'Invalid Admin email or password');
    }
    if (!user.is_email_verified) throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Verify the Admin email before signing in');
    if (user.status !== 'ACTIVE') throw new AppError(403, 'ACCOUNT_INACTIVE', 'This Admin account is inactive');

    const challengeId = crypto.randomUUID();
    const otp = randomOtp();
    await this.repository.transaction((connection) => this.repository.replaceAdminLoginChallenge(
      challengeId, user.id, hashToken(otp), expiresIn(env.EMAIL_OTP_TTL_MINUTES * 60_000), connection,
    ));
    const delivery = await this.emailService.sendAdminLoginOtp(
      { id: user.id, email: user.email, fullName: user.full_name }, otp,
    );
    if (!delivery.delivered) throw new AppError(503, 'ADMIN_OTP_DELIVERY_FAILED', 'The security code could not be delivered. Please try again.');
    return { challengeId, expiresInMinutes: env.EMAIL_OTP_TTL_MINUTES };
  }

  async verifyAdminLogin(input, request = {}) {
    const sessionId = crypto.randomUUID();
    const refreshToken = randomToken(48);
    const result = await this.repository.transaction(async (connection) => {
      const admin = await this.repository.consumeAdminLoginOtp(
        input.challengeId, normalizeEmail(input.email), hashToken(input.otp), env.EMAIL_OTP_MAX_ATTEMPTS, connection,
      );
      if (!admin || admin.invalid) throw new AppError(400, 'ADMIN_OTP_INVALID', 'The security code is invalid or expired');
      await this.repository.createSession({
        id: sessionId, userId: admin.user_id, refreshTokenHash: hashToken(refreshToken),
        expiresAt: expiresIn(env.REFRESH_TOKEN_TTL_DAYS * 86_400_000),
        ipAddress: request.ip, userAgent: request.userAgent?.slice(0, 255),
      }, connection);
      await this.repository.touchLogin(admin.user_id, connection);
      await this.repository.audit({
        actorUserId: admin.user_id, action: 'ADMIN_LOGIN_VERIFIED', entityType: 'USER',
        entityId: admin.user_id, ipAddress: request.ip,
      }, connection);
      return admin;
    });
    return {
      user: publicUser({ ...result, id: result.user_id }),
      accessToken: await signAccessToken({ ...result, id: result.user_id }, sessionId),
      refreshToken,
      csrfToken: randomToken(),
    };
  }

  async refresh(rawRefreshToken) {
    if (!rawRefreshToken) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    const nextRefreshToken = randomToken(48);
    const session = await this.repository.transaction((connection) => this.repository.rotateSession(hashToken(rawRefreshToken), hashToken(nextRefreshToken), connection));
    if (session?.reused) throw new AppError(401, 'SESSION_REUSE_DETECTED', 'This session was revoked for security');
    if (!session || session.status !== 'ACTIVE' || !session.is_email_verified) throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
    return {
      user: publicUser(session), accessToken: await signAccessToken(session, session.session_id),
      refreshToken: nextRefreshToken, csrfToken: randomToken(),
    };
  }

  async logout(rawRefreshToken) {
    if (rawRefreshToken) await this.repository.revokeSessionByToken(hashToken(rawRefreshToken));
  }

  async forgotPassword(email) {
    const user = await this.repository.findUserByEmail(normalizeEmail(email));
    if (user && user.status === 'ACTIVE' && user.is_email_verified) {
      const rawToken = randomToken();
      await this.repository.transaction((connection) => this.repository.replaceResetToken(user.id, hashToken(rawToken), expiresIn(30 * 60_000), connection));
      await this.emailService.sendPasswordReset({ id: user.id, email: user.email, fullName: user.full_name }, rawToken);
    }
  }

  async resetPassword(rawToken, password) {
    this.validatePassword(password);
    const passwordHash = await this.passwordEngine.hash(password, { type: argon2.argon2id });
    const reset = await this.repository.transaction(async (connection) => {
      const result = await this.repository.consumeResetToken(hashToken(rawToken), passwordHash, connection);
      if (!result) return null;
      await this.repository.audit({ actorUserId: result.user_id, action: 'PASSWORD_RESET', entityType: 'USER', entityId: result.user_id }, connection);
      return result;
    });
    if (!reset) throw new AppError(400, 'RESET_TOKEN_INVALID', 'This password-reset link is invalid or expired');
    await this.emailService.sendPasswordChanged({ id: reset.user_id, email: reset.email, fullName: reset.full_name });
  }

  async changePassword(user, currentPassword, password, request = {}) {
    this.validatePassword(password);
    const identity = await this.repository.findIdentity(normalizeEmail(user.email));
    if (!identity || !(await this.passwordEngine.verify(identity.password_hash, currentPassword))) {
      throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'The current password is incorrect');
    }
    const passwordHash = await this.passwordEngine.hash(password, { type: argon2.argon2id });
    await this.repository.transaction(async (connection) => {
      await this.repository.updatePassword(user.id, passwordHash, connection);
      await this.repository.audit({ actorUserId: user.id, action: 'PASSWORD_CHANGED', entityType: 'USER', entityId: user.id, ipAddress: request.ip }, connection);
    });
    await this.emailService.sendPasswordChanged({ id: user.id, email: user.email, fullName: user.full_name });
  }
}
