import crypto from 'node:crypto';

export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('base64url');
export const randomOtp = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
export const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
export const timingSafeEqual = (left, right) => {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
};
