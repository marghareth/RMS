// FILE: src/lib/rate-limit.ts
//
// Shared rate-limiting building block, used by login (src/lib/auth.ts),
// the public certificate-verification endpoint, and bulk certificate
// actions. Previously each of these either had its own bespoke limiter
// (login) or no limiting at all (verify, bulk actions).
//
// STORAGE: `RateLimitStore` is the one seam that matters for scaling.
//
// FIX (Vercel): the limiter used to keep its counts only in a process-local
// Map. Vercel runs the app as many short-lived serverless instances, each
// with its own empty Map, so "5 failed logins per 15 minutes" was really
// "5 per instance, reset whenever an instance is recycled" — an attacker
// spreading guesses across instances was barely slowed down.
//
// Counts now live in Upstash Redis when it's configured, so every instance
// shares one counter:
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN   (Upstash console), or
//   KV_REST_API_URL / KV_REST_API_TOKEN                 (added automatically
//                                                        by Vercel's Upstash
//                                                        integration)
// Setup: Vercel → Project → Storage (or Marketplace) → Upstash for Redis →
// connect it to this project, then redeploy. The free tier is plenty for
// this app. Talks to Upstash's REST API with plain `fetch`, so there is no
// extra npm dependency and it works in every runtime.
//
// Without those variables (local `next dev`, a single self-hosted server)
// the in-memory store is used, exactly as before. If Upstash is configured
// but unreachable, each call falls back to the in-memory store for that
// instance rather than failing — logins keep working, and limits still apply
// per instance until Upstash is back.

import { NextResponse } from "next/server";

export interface RateLimitRecord {
  count: number;
  windowStartedAt: number;
}

export interface RateLimitStore {
  /** Reads the current record for `key` without modifying it. Null if none exists or its window has expired. */
  peek(key: string, windowMs: number): Promise<RateLimitRecord | null>;
  /** Atomically increments the counter for `key`, starting a new window if the previous one expired. */
  increment(key: string, windowMs: number): Promise<RateLimitRecord>;
  /** Clears a key entirely — used on successful auth so a good attempt isn't held against future ones. */
  reset(key: string): Promise<void>;
}

export class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, RateLimitRecord>();

  async peek(key: string, windowMs: number): Promise<RateLimitRecord | null> {
    const existing = this.store.get(key);
    if (!existing) return null;
    if (Date.now() - existing.windowStartedAt > windowMs) return null;
    return existing;
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const now = Date.now();
    const existing = this.store.get(key);

    if (!existing || now - existing.windowStartedAt > windowMs) {
      const fresh: RateLimitRecord = { count: 1, windowStartedAt: now };
      this.store.set(key, fresh);
      return fresh;
    }

    existing.count += 1;
    return existing;
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }
}

export interface UpstashConfig {
  url: string;
  token: string;
  /** Prepended to every key, so this app's counters can't collide with anything else in the same Redis database. */
  prefix?: string;
}

// INCR and "start the window on the first hit" must happen atomically,
// otherwise two simultaneous first requests could both skip the expiry and
// leave a counter that never resets. A tiny Lua script runs as one step in
// Redis. Returns {count, milliseconds left in the window}.
const INCREMENT_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
local ttl = redis.call('PTTL', KEYS[1])
if ttl < 0 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
  ttl = tonumber(ARGV[1])
end
return {count, ttl}
`;

type UpstashReply = { result?: unknown; error?: string };

/**
 * Shared counters in Upstash Redis via its REST API. A key's TTL is the
 * window: it starts at the first hit and the key disappears when it ends.
 */
export class UpstashRateLimitStore implements RateLimitStore {
  private url: string;
  private token: string;
  private prefix: string;

  constructor(config: UpstashConfig, private fetchImpl: typeof fetch = (...args) => fetch(...args)) {
    this.url = config.url.replace(/\/+$/, "");
    this.token = config.token;
    this.prefix = config.prefix ?? "rms:ratelimit:";
  }

  private async pipeline(commands: (string | number)[][]): Promise<unknown[]> {
    const res = await this.fetchImpl(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Upstash HTTP ${res.status}`);
    const replies = (await res.json()) as UpstashReply[];
    if (!Array.isArray(replies) || replies.length !== commands.length) throw new Error("Unexpected Upstash response");
    return replies.map((r) => {
      if (r.error) throw new Error(`Upstash: ${r.error}`);
      return r.result;
    });
  }

  async peek(key: string, windowMs: number): Promise<RateLimitRecord | null> {
    const [count, ttl] = await this.pipeline([
      ["GET", this.prefix + key],
      ["PTTL", this.prefix + key],
    ]);
    if (count === null || count === undefined) return null;
    const ttlMs = Number(ttl);
    if (ttlMs <= 0) return null; // expired, or a stray key with no window
    return { count: Number(count), windowStartedAt: Date.now() - (windowMs - ttlMs) };
  }

  async increment(key: string, windowMs: number): Promise<RateLimitRecord> {
    const [reply] = await this.pipeline([["EVAL", INCREMENT_SCRIPT, 1, this.prefix + key, windowMs]]);
    const [count, ttl] = reply as [number, number];
    return { count: Number(count), windowStartedAt: Date.now() - (windowMs - Number(ttl)) };
  }

  async reset(key: string): Promise<void> {
    await this.pipeline([["DEL", this.prefix + key]]);
  }
}

/**
 * Uses `primary` (Upstash) and quietly switches to `fallback` (memory) for
 * any call where the primary fails, so a Redis outage never locks everyone
 * out of logging in. Warns at most once a minute.
 */
export class FallbackRateLimitStore implements RateLimitStore {
  private lastWarnAt = 0;

  constructor(private primary: RateLimitStore, private fallback: RateLimitStore) {}

  private warn(err: unknown) {
    const now = Date.now();
    if (now - this.lastWarnAt < 60_000) return;
    this.lastWarnAt = now;
    console.warn(
      "[rate-limit] shared store unreachable, using this instance's memory for now:",
      err instanceof Error ? err.message : err
    );
  }

  private async run<T>(op: (store: RateLimitStore) => Promise<T>): Promise<T> {
    try {
      return await op(this.primary);
    } catch (err) {
      this.warn(err);
      return op(this.fallback);
    }
  }

  peek(key: string, windowMs: number) {
    return this.run((s) => s.peek(key, windowMs));
  }

  increment(key: string, windowMs: number) {
    return this.run((s) => s.increment(key, windowMs));
  }

  async reset(key: string) {
    // Clear both, so a key counted in memory during an outage doesn't linger.
    await this.run((s) => s.reset(key));
    await this.fallback.reset(key);
  }
}

/** Upstash settings from the environment, or null if they aren't set. */
export function getUpstashConfig(env: Record<string, string | undefined> = process.env): UpstashConfig | null {
  const url = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL)?.trim();
  const token = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN)?.trim();
  if (!url || !token) return null;
  return { url, token };
}

/** Picks the store for this deployment: shared Upstash when configured, else in-memory. */
export function createDefaultStore(env: Record<string, string | undefined> = process.env): RateLimitStore {
  const memory = new MemoryRateLimitStore();
  const upstash = getUpstashConfig(env);
  if (upstash) return new FallbackRateLimitStore(new UpstashRateLimitStore(upstash), memory);

  if (env.VERCEL && env.NODE_ENV === "production") {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are not set. On Vercel each instance keeps " +
        "its own counts, so login and verify limits are much weaker than configured. Connect Upstash for Redis to fix this."
    );
  }
  return memory;
}

// One shared store per process. Each named limiter below still keys its
// own entries (see the `${namespace}:` prefix in RateLimiter), so
// different limiters never collide with each other in the same store.
const defaultStore = createDefaultStore();

export interface RateLimiterOptions {
  /** Distinguishes this limiter's keys from every other limiter sharing a store. */
  namespace: string;
  /** How many hits are allowed within the window. */
  max: number;
  /** Window length in milliseconds. */
  windowMs: number;
  store?: RateLimitStore;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  /** Seconds until the caller should retry — only meaningful when !allowed. */
  retryAfterSeconds: number;
}

export class RateLimiter {
  private namespace: string;
  private max: number;
  private windowMs: number;
  private store: RateLimitStore;

  constructor(options: RateLimiterOptions) {
    this.namespace = options.namespace;
    this.max = options.max;
    this.windowMs = options.windowMs;
    this.store = options.store ?? defaultStore;
  }

  private key(key: string): string {
    return `${this.namespace}:${key}`;
  }

  // BUGFIX: this used to be a single `count <= this.max` comparison shared
  // by every caller, but "count" means two different things depending on
  // when it's read:
  //   - POST-increment (check/penalize): `record.count` already includes
  //     *this* attempt, so `count <= max` is correct — it's how you allow
  //     exactly `max` attempts total (the max'th increment still passes).
  //   - PRE-increment (peek): `record.count` reflects only attempts
  //     already recorded *before* this one. Reusing `count <= max` here
  //     meant that once `max` prior failures had been penalized, peek()
  //     still reported `allowed: true` for one more — e.g. with
  //     max=5, after 5 recorded failures `peek()` saw count=5 and
  //     `5 <= 5` let a 6th attempt through the login gate before
  //     `penalize()` ever pushed the count to 6 and finally tripped
  //     `peek()`'s block on attempt #7. "5 attempts / 15 min" was
  //     actually enforcing 6.
  //
  // Fix: `toResult` now takes an explicit `phase` so pre- and
  // post-increment reads use the comparison that's actually correct for
  // what `count` means at that point, instead of assuming they're the
  // same check.
  private toResult(record: RateLimitRecord | null, phase: "pre" | "post"): RateLimitResult {
    const count = record?.count ?? 0;
    const allowed = phase === "post" ? count <= this.max : count < this.max;
    const resetAt = (record?.windowStartedAt ?? Date.now()) + this.windowMs;
    const retryAfterSeconds = Math.max(0, Math.ceil((resetAt - Date.now()) / 1000));
    return { allowed, remaining: Math.max(0, this.max - count), retryAfterSeconds };
  }

  /**
   * Simple case: every call to a rate-limited endpoint counts against the
   * budget, whether it succeeds or fails. Use this for anything that
   * isn't login's "only penalize on an actual wrong credential" shape —
   * e.g. the public verify endpoint, bulk certificate actions.
   */
  async check(key: string): Promise<RateLimitResult> {
    const record = await this.store.increment(this.key(key), this.windowMs);
    return this.toResult(record, "post");
  }

  /**
   * Read-only: reports whether `key` is currently blocked without
   * counting this call as an attempt. Use as the gate at the top of a
   * flow where only some outcomes should count against the budget — e.g.
   * login: a wrong password counts, but the "please enter your MFA code"
   * round-trip on an otherwise-correct login should not.
   */
  async peek(key: string): Promise<RateLimitResult> {
    const record = await this.store.peek(this.key(key), this.windowMs);
    return this.toResult(record, "pre");
  }

  /** Records an actual failure (wrong password, wrong MFA code, etc.). */
  async penalize(key: string): Promise<RateLimitResult> {
    const record = await this.store.increment(this.key(key), this.windowMs);
    return this.toResult(record, "post");
  }

  async reset(key: string): Promise<void> {
    await this.store.reset(this.key(key));
  }
}

/**
 * Best-effort client identifier for unauthenticated/public endpoints.
 *
 * SECURITY FIX: this used to return the *first* entry in `x-forwarded-for`
 * — but that's the leftmost hop, which is whatever the client itself sent
 * (`X-Forwarded-For: 1.1.1.1` is a completely ordinary header for any
 * caller to set on a raw HTTP request). Proxies *append* to this header
 * rather than replace it, so the value your own reverse proxy/load
 * balancer actually observed and added is the *last* entry, not the
 * first. Taking the first entry let anyone bypass IP-keyed rate limiting
 * outright by sending a different fake address on every request — no
 * proxy involved, no spoofing sophistication required.
 *
 * Prefers `x-real-ip` when present, since well-behaved proxies (nginx's
 * `proxy_set_header X-Real-IP $remote_addr`, etc.) set it themselves as a
 * single value rather than letting the client's own copy of it through.
 * Falls back to the last `x-forwarded-for` entry, then to a constant so
 * the limiter still degrades to "one shared bucket" rather than throwing
 * when no proxy header is set at all (e.g. plain `next dev`).
 *
 * Still trust-on-first-use rather than a real client identity: a caller
 * one hop closer than your reverse proxy (or the proxy itself, if it's
 * ever misconfigured to forward these headers through unmodified) can
 * still influence this value. Fine for the current use case (light
 * defense-in-depth on a public, UUID-keyed lookup), not a substitute for
 * per-account/per-token rate limiting on anything more sensitive.
 */
export function getClientIp(req: Request): string {
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((h) => h.trim()).filter(Boolean);
    if (hops.length > 0) return hops[hops.length - 1];
  }
  return "unknown";
}

export function tooManyRequestsResponse(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      error: "RATE_LIMITED",
      message: "Too many requests. Please try again later.",
    },
    {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    }
  );
}