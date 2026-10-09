// FILE: src/lib/rate-limit.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getClientIp, PrismaRateLimitStore, RateLimiter } from './rate-limit';
import { prisma } from './db';

vi.mock('./db', () => ({
  prisma: {
    $queryRaw: vi.fn(),
    rateLimitBucket: { findUnique: vi.fn(), deleteMany: vi.fn().mockResolvedValue({ count: 0 }) },
  },
}));

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

describe('PrismaRateLimitStore', () => {
  beforeEach(() => vi.clearAllMocks());

  it('uses the count returned by the atomic upsert', async () => {
    const started = new Date();
    (prisma.$queryRaw as any).mockResolvedValue([{ count: 3, window_started_at: started }]);
    const store = new PrismaRateLimitStore();
    await expect(store.increment('login:admin', 60_000)).resolves.toEqual({ count: 3, windowStartedAt: started.getTime() });
  });

  it('ignores a stored window that has already expired', async () => {
    (prisma.rateLimitBucket.findUnique as any).mockResolvedValue({ count: 9, window_started_at: new Date(Date.now() - 120_000) });
    const store = new PrismaRateLimitStore();
    await expect(store.peek('login:admin', 60_000)).resolves.toBeNull();
  });

  it('falls back to in-memory counting when the database is unreachable', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    (prisma.$queryRaw as any).mockRejectedValue(new Error('P1001'));
    (prisma.rateLimitBucket.findUnique as any).mockRejectedValue(new Error('P1001'));
    const limiter = new RateLimiter({ namespace: 't', max: 2, windowMs: 60_000, store: new PrismaRateLimitStore() });

    expect((await limiter.penalize('k')).allowed).toBe(true);
    expect((await limiter.penalize('k')).allowed).toBe(true);
    expect((await limiter.peek('k')).allowed).toBe(false);
  });
});
