import { env } from '../../config/env.js';

const base = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax',
  path: '/',
  ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
};

export function setSessionCookies(res, { accessToken, refreshToken, csrfToken }) {
  res.cookie('ts_access', accessToken, { ...base, maxAge: env.ACCESS_TOKEN_TTL_MINUTES * 60_000 });
  res.cookie('ts_refresh', refreshToken, { ...base, maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000 });
  res.cookie('ts_csrf', csrfToken, {
    ...base,
    httpOnly: false,
    maxAge: env.REFRESH_TOKEN_TTL_DAYS * 86_400_000,
  });
}

export function clearSessionCookies(res) {
  for (const name of ['ts_access', 'ts_refresh', 'ts_csrf']) res.clearCookie(name, base);
}
