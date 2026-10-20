import { isIP } from 'node:net';
import { env } from '../config/env.js';

export function normalizeIpAddress(value) {
  if (!value) return null;
  const address = String(value).trim();
  const mappedIpv4 = address.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i)?.[1];
  if (mappedIpv4 && isIP(mappedIpv4) === 4) return mappedIpv4;
  return isIP(address) ? address : null;
}

export function ipVersion(value) {
  const address = normalizeIpAddress(value);
  const version = address ? isIP(address) : 0;
  return version ? `IPv${version}` : null;
}

const isLoopback = (value) => value === '::1' || /^127(?:\.\d{1,3}){3}$/.test(value || '');
const firstHeaderAddress = (value) => normalizeIpAddress(Array.isArray(value) ? value[0] : String(value || '').split(',')[0]);

export function clientIpFromRequest(request) {
  const resolvedAddress = normalizeIpAddress(request.ip);
  if (resolvedAddress && !isLoopback(resolvedAddress)) return resolvedAddress;

  const peerAddress = normalizeIpAddress(request.socket?.remoteAddress);
  const trustedProxy = env.TRUST_PROXY || (env.NODE_ENV !== 'production' && isLoopback(peerAddress));
  if (!trustedProxy) return resolvedAddress;

  for (const header of ['cf-connecting-ip', 'true-client-ip', 'x-real-ip']) {
    const address = firstHeaderAddress(request.headers?.[header]);
    if (address) return address;
  }
  return resolvedAddress;
}
