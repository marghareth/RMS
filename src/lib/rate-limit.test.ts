// FILE: src/lib/rate-limit.test.ts
import { describe, it, expect } from 'vitest';
import { getClientIp } from './rate-limit';

function reqWith(headers: Record<string, string>): Request {
  return new Request('https://example.com', { headers });
}

describe('getClientIp', () => {
  it('trusts the last x-forwarded-for hop, not the client-supplied first one', () => {
    // The client can put anything it wants as the leftmost entry — only
    // the last entry (appended by the nearest proxy) is trustworthy.
    const req = reqWith({ 'x-forwarded-for': '9.9.9.9, 203.0.113.7' });
    expect(getClientIp(req)).toBe('203.0.113.7');
  });

  it('is not fooled by a caller spoofing a different fake first IP on every request', () => {
    // Regression check for the original bug: rotating the leftmost entry
    // used to change the returned value (and so the rate-limit bucket)
    // on every request. It must not anymore — the real client didn't
    // move, only the attacker-controlled prefix did.
    const real = '203.0.113.7';
    const attempt1 = getClientIp(reqWith({ 'x-forwarded-for': `1.1.1.1, ${real}` }));
    const attempt2 = getClientIp(reqWith({ 'x-forwarded-for': `2.2.2.2, ${real}` }));
    const attempt3 = getClientIp(reqWith({ 'x-forwarded-for': `${real}` })); // no fake prefix at all
    expect(attempt1).toBe(real);
    expect(attempt2).toBe(real);
    expect(attempt1).toBe(attempt2);
    // A single-hop header (no proxy in front) is still just itself.
    expect(attempt3).toBe(real);
  });

  it('prefers x-real-ip over x-forwarded-for when both are present', () => {
    const req = reqWith({
      'x-real-ip': '203.0.113.7',
      'x-forwarded-for': '1.1.1.1, 8.8.8.8',
    });
    expect(getClientIp(req)).toBe('203.0.113.7');
  });

  it('trims whitespace around forwarded-for entries', () => {
    const req = reqWith({ 'x-forwarded-for': '  1.1.1.1 ,  203.0.113.7  ' });
    expect(getClientIp(req)).toBe('203.0.113.7');
  });

  it('falls back to a constant when no proxy header is present at all', () => {
    expect(getClientIp(reqWith({}))).toBe('unknown');
  });
});