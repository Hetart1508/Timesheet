import { SignJWT, jwtVerify } from 'jose';
import { env } from '../../config/env.js';
import { AppError } from '../../utils/app-error.js';

const key = new TextEncoder().encode(env.JWT_ACCESS_SECRET);

export async function signAccessToken(user, sessionId) {
  return new SignJWT({ role: user.role, sid: sessionId, typ: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(String(user.id))
    .setIssuer(env.JWT_ISSUER)
    .setAudience(env.JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${env.ACCESS_TOKEN_TTL_MINUTES}m`)
    .sign(key);
}

export async function verifyAccessToken(token) {
  try {
    const { payload } = await jwtVerify(token, key, {
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
      algorithms: ['HS256'],
    });
    if (payload.typ !== 'access' || !payload.sub || !payload.sid) throw new Error('Wrong token type');
    return payload;
  } catch {
    throw new AppError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required');
  }
}
