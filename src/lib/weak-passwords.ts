// FILE: src/lib/weak-passwords.ts
//
// Helpers for scripts/check-default-passwords.ts, which finds accounts that
// still have a default or easily guessed password and can reset them.
//
// The old seed script created six accounts with passwords like admin123 and
// captain123, so those are checked first, along with common weak passwords
// and "<username>123"-style patterns.
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
 * passwords, common weak ones, and username-based patterns ("<username>123",
 * and the same with trailing digits removed, which is how kagawad1 got
 * "kagawad123").
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
 * A random password from a cryptographically secure source, used when the
 * checker resets an account. Grouped as xxxx-xxxx-xxxx-xxxx so it's easy to
 * read aloud and type; 16 characters from a 56-letter alphabet is about 93
 * bits of entropy.
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