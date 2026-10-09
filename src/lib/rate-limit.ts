// FILE: src/lib/rate-limit.ts
//
// Shared rate-limiting building block, used by login (src/lib/auth.ts),
// the public certificate-verification endpoint, and bulk certificate
// actions. Previously each of these either had its own bespoke limiter
// (login) or no limiting at all (verify, bulk actions).
//
// STORAGE: `RateLimitStore` is the one seam that matters for scaling.
// `MemoryRateLimitStore` below keeps counts in a process-local Map, which
// is fine for a single Node instance (typical for a barangay-scale
// deployment) but — as flagged previously on the login limiter — does
// NOT share state across multiple instances behind a load balancer. If
// this app is ever deployed that way, write a second class implementing
// `RateLimitStore` against Redis/Upstash (GET, INCR + PEXPIRE is the
// whole implementation) and pass it into `new RateLimiter({ store })`
// wherever a limiter is constructed. Nothing else in this file, or in any
// of its callers, needs to change — that's the point of the interface.

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

// One shared instance per process. Each named limiter below still keys
// its own entries (see the `${namespace}:` prefix in RateLimiter), so
// different limiters never collide with each other in this one map.
const defaultStore = new MemoryRateLimitStore();

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