// FILE: src/lib/rate-limit.test.ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  createDefaultStore,
  FallbackRateLimitStore,
  getClientIp,
  getUpstashConfig,
  MemoryRateLimitStore,
  RateLimiter,
  UpstashRateLimitStore,
  type RateLimitStore,
} from './rate-limit';

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
// ─── Shared (Upstash) store ─────────────────────────────────────────────────
//
// A tiny fake of Upstash's REST /pipeline endpoint: understands just the
// commands UpstashRateLimitStore sends (GET, PTTL, DEL, and the INCR+PEXPIRE
// Lua script via EVAL) and keeps keys with expiry times, so the tests below
// exercise the real request/response shape end to end.
function fakeUpstash() {
  const data = new Map<string, { value: number; expiresAt: number | null }>();
  const live = (k: string) => {
    const e = data.get(k);
    if (e && e.expiresAt !== null && e.expiresAt <= Date.now()) {
      data.delete(k);
      return undefined;
    }
    return e;
  };
  const calls: unknown[] = [];
  const fetchImpl = vi.fn(async (_url: string, init: RequestInit) => {
    const commands = JSON.parse(String(init.body)) as (string | number)[][];
    calls.push(commands);
    const results = commands.map(([cmd, ...args]) => {
      switch (cmd) {
        case 'GET':
          return { result: live(String(args[0]))?.value?.toString() ?? null };
        case 'PTTL': {
          const e = live(String(args[0]));
          return { result: !e ? -2 : e.expiresAt === null ? -1 : e.expiresAt - Date.now() };
        }
        case 'DEL':
          return { result: data.delete(String(args[0])) ? 1 : 0 };
        case 'EVAL': {
          const key = String(args[2]);
          const windowMs = Number(args[3]);
          const e = live(key) ?? { value: 0, expiresAt: null };
          e.value += 1;
          if (e.expiresAt === null) e.expiresAt = Date.now() + windowMs;
          data.set(key, e);
          return { result: [e.value, e.expiresAt - Date.now()] };
        }
        default:
          return { error: `unknown command ${cmd}` };
      }
    });
    return new Response(JSON.stringify(results), { status: 200 });
  });
  return { fetchImpl, data, calls };
}

describe('UpstashRateLimitStore', () => {
  afterEach(() => vi.useRealTimers());

  it('shares one counter between separate instances (the Vercel problem)', async () => {
    const redis = fakeUpstash();
    const cfg = { url: 'https://example.upstash.io', token: 't' };
    // Two serverless instances = two limiter objects, one Redis.
    const a = new RateLimiter({ namespace: 'login', max: 2, windowMs: 60_000, store: new UpstashRateLimitStore(cfg, redis.fetchImpl as unknown as typeof fetch) });
    const b = new RateLimiter({ namespace: 'login', max: 2, windowMs: 60_000, store: new UpstashRateLimitStore(cfg, redis.fetchImpl as unknown as typeof fetch) });

    expect((await a.penalize('maria')).allowed).toBe(true);
    expect((await b.penalize('maria')).allowed).toBe(true);
    // Third failure, on either instance, trips the limit for both.
    expect((await a.penalize('maria')).allowed).toBe(false);
    expect((await b.peek('maria')).allowed).toBe(false);
  });

  it('sends the token, prefixes keys, and starts the window on the first hit', async () => {
    const redis = fakeUpstash();
    const store = new UpstashRateLimitStore({ url: 'https://example.upstash.io/', token: 'secret' }, redis.fetchImpl as unknown as typeof fetch);
    const rec = await store.increment('login:maria', 60_000);

    const [url, init] = redis.fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://example.upstash.io/pipeline');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer secret');
    expect(redis.data.has('rms:ratelimit:login:maria')).toBe(true);
    expect(rec.count).toBe(1);
    expect(Math.abs(rec.windowStartedAt - Date.now())).toBeLessThan(1000);
  });

  it('forgets a key after its window ends, and on reset', async () => {
    vi.useFakeTimers();
    const redis = fakeUpstash();
    const store = new UpstashRateLimitStore({ url: 'https://x', token: 't' }, redis.fetchImpl as unknown as typeof fetch);

    await store.increment('k', 1_000);
    expect((await store.peek('k', 1_000))?.count).toBe(1);
    vi.advanceTimersByTime(1_001);
    expect(await store.peek('k', 1_000)).toBeNull();

    await store.increment('k', 1_000);
    await store.reset('k');
    expect(await store.peek('k', 1_000)).toBeNull();
  });

  it('reports retry-after from the shared window', async () => {
    const redis = fakeUpstash();
    const limiter = new RateLimiter({
      namespace: 'verify',
      max: 1,
      windowMs: 60_000,
      store: new UpstashRateLimitStore({ url: 'https://x', token: 't' }, redis.fetchImpl as unknown as typeof fetch),
    });
    await limiter.check('1.2.3.4');
    const blocked = await limiter.check('1.2.3.4');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(55);
    expect(blocked.retryAfterSeconds).toBeLessThanOrEqual(60);
  });

  it('throws on an HTTP or command error so the fallback can take over', async () => {
    const down = vi.fn(async () => new Response('nope', { status: 503 }));
    const store = new UpstashRateLimitStore({ url: 'https://x', token: 't' }, down as unknown as typeof fetch);
    await expect(store.increment('k', 1000)).rejects.toThrow(/503/);
  });
});

describe('FallbackRateLimitStore', () => {
  it('keeps limiting with in-memory counts when the shared store is down', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const broken: RateLimitStore = {
      peek: async () => { throw new Error('ECONNREFUSED'); },
      increment: async () => { throw new Error('ECONNREFUSED'); },
      reset: async () => { throw new Error('ECONNREFUSED'); },
    };
    const limiter = new RateLimiter({
      namespace: 'login',
      max: 1,
      windowMs: 60_000,
      store: new FallbackRateLimitStore(broken, new MemoryRateLimitStore()),
    });

    expect((await limiter.peek('maria')).allowed).toBe(true); // no lock-out because Redis is down
    await limiter.penalize('maria');
    expect((await limiter.peek('maria')).allowed).toBe(false); // but limits still apply
    await limiter.reset('maria');
    expect((await limiter.peek('maria')).allowed).toBe(true);
    expect(warn).toHaveBeenCalledTimes(1); // warned once, not on every call
    warn.mockRestore();
  });
});

describe('createDefaultStore', () => {
  it('uses Upstash (with memory fallback) when configured', () => {
    expect(createDefaultStore({ UPSTASH_REDIS_REST_URL: 'https://x', UPSTASH_REDIS_REST_TOKEN: 't' })).toBeInstanceOf(FallbackRateLimitStore);
  });

  it("accepts the variable names Vercel's Upstash integration adds", () => {
    expect(getUpstashConfig({ KV_REST_API_URL: 'https://kv', KV_REST_API_TOKEN: 'tok' })).toEqual({ url: 'https://kv', token: 'tok' });
  });

  it('uses memory when nothing is configured, and warns on Vercel production', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(createDefaultStore({})).toBeInstanceOf(MemoryRateLimitStore);
    expect(warn).not.toHaveBeenCalled();
    expect(createDefaultStore({ VERCEL: '1', NODE_ENV: 'production' })).toBeInstanceOf(MemoryRateLimitStore);
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/UPSTASH_REDIS_REST_URL/));
    warn.mockRestore();
  });
});