import { describe, expect, it } from 'vitest';
import { clientIpFromRequest, ipVersion, normalizeIpAddress } from '../src/utils/ip-address.js';

describe('IP address normalization', () => {
  it('converts IPv4-mapped IPv6 values to plain IPv4', () => {
    expect(normalizeIpAddress('::ffff:192.0.2.7')).toBe('192.0.2.7');
    expect(ipVersion('::ffff:192.0.2.7')).toBe('IPv4');
  });

  it('preserves valid IPv4 and IPv6 values', () => {
    expect(normalizeIpAddress('203.0.113.8')).toBe('203.0.113.8');
    expect(normalizeIpAddress('2001:db8::8')).toBe('2001:db8::8');
    expect(ipVersion('2001:db8::8')).toBe('IPv6');
  });

  it('does not expose malformed address values', () => {
    expect(normalizeIpAddress('not-an-ip')).toBeNull();
    expect(ipVersion('not-an-ip')).toBeNull();
  });

  it('uses a proxy-specific client header only through the trusted local development proxy', () => {
    expect(clientIpFromRequest({
      ip: '::1',
      socket: { remoteAddress: '::1' },
      headers: { 'cf-connecting-ip': '49.36.90.90' },
    })).toBe('49.36.90.90');
  });
});
