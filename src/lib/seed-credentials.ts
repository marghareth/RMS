// FILE: src/lib/seed-credentials.ts
//
// Helpers shared by the seed script (prisma/migrations/seed.ts) and the
// default-password checker (scripts/check-default-passwords.ts).
//
// SECURITY FIX: the seed used to create six accounts with passwords like
// admin/admin123 and captain/captain123, and printed them in the README-style
// banner at the end. Anyone who had seen the repo could try those on the live
// site. The seed now generates a strong random password per account (shown
// once, in the terminal that ran it), refuses to run against a remote
// database unless explicitly told to, and the checker script can find and
// rotate any account that still has one of the old passwords.
//
// Pure module: only Node's crypto, no Prisma, so it is easy to unit test.

import { randomInt } from "node:crypto";

/** The passwords the old seed script created. Never use these anywhere. */
export const LEGACY_SEED_PASSWORDS: Record<string, string> = {
  admin: "admin123",
  captain: "captain123",
  secretary: "secretary123",
  kagawad1: "kagawad123",
  bhw1: "bhw123",
  encoder1: "encoder123",
};

/** Common weak passwords worth checking every account against. */
const COMMON_WEAK_PASSWORDS = [
  "password",
  "password123",
  "admin",
  "12345678",
  "123456789",
  "barangay",
  "barangay123",
  "changeme",
  "qwerty123",
];

/**
 * Every password the checker should try for one account: the old seed
 * passwords, common weak ones, and the username-based patterns the old seed
 * used ("<username>123", and the same with trailing digits removed, which is
 * how kagawad1 got "kagawad123").
 */
export function weakPasswordCandidates(username: string): string[] {
  const base = username.replace(/\d+$/, "");
  const candidates = new Set<string>([
    ...Object.values(LEGACY_SEED_PASSWORDS),
    ...COMMON_WEAK_PASSWORDS,
    username,
    `${username}123`,
    `${username}1234`,
    base,
    `${base}123`,
    `${base}1234`,
  ]);
  candidates.delete("");
  return [...candidates];
}

// No 0/O, 1/l/I — passwords are read off a terminal and typed by hand.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/**
 * A random password from a cryptographically secure source. Grouped as
 * xxxx-xxxx-xxxx-xxxx so it's easy to read aloud and type; 16 characters
 * from a 56-letter alphabet is about 93 bits of entropy.
 */
export function generateStrongPassword(groups = 4, groupLength = 4): string {
  const parts: string[] = [];
  for (let g = 0; g < groups; g++) {
    let part = "";
    for (let i = 0; i < groupLength; i++) part += ALPHABET[randomInt(ALPHABET.length)];
    parts.push(part);
  }
  return parts.join("-");
}

/** True when DATABASE_URL points at this machine (local Postgres / Docker). */
export function isLocalDatabaseUrl(databaseUrl: string | undefined): boolean {
  if (!databaseUrl) return false;
  try {
    const host = new URL(databaseUrl).hostname;
    return host === "localhost" || host === "127.0.0.1" || host === "::1" || host === "[::1]" || host === "postgres";
  } catch {
    return false;
  }
}

export interface SeedGuardResult {
  allowed: boolean;
  reason?: string;
}

/**
 * The seed fills the database with sample residents, blotter cases, money
 * records and audit entries. That's useful on a laptop and harmful on the
 * live Supabase database, so it only runs against a local database unless
 * ALLOW_REMOTE_SEED=1 is set on purpose.
 */
export function checkSeedTarget(env: Record<string, string | undefined> = process.env): SeedGuardResult {
  if (env.ALLOW_REMOTE_SEED === "1") return { allowed: true };
  if (env.NODE_ENV === "production") {
    return {
      allowed: false,
      reason: "NODE_ENV is 'production'. The seed adds sample data and must not run against the live database.",
    };
  }
  if (!isLocalDatabaseUrl(env.DATABASE_URL)) {
    return {
      allowed: false,
      reason:
        "DATABASE_URL does not point at a local database (localhost / 127.0.0.1). The seed adds sample residents, cases and records, so it must not run against the live Supabase database.",
    };
  }
  return { allowed: true };
}

/**
 * Local-only convenience: SEED_DEMO_PASSWORDS=1 keeps the short demo
 * passwords (admin123 etc.) so a developer doesn't have to copy random ones.
 * Ignored unless the database is local, so it can never reach production.
 */
export function demoPasswordsEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.SEED_DEMO_PASSWORDS === "1" && env.NODE_ENV !== "production" && isLocalDatabaseUrl(env.DATABASE_URL);
}