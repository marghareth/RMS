// FILE: src/lib/mfa.ts
//
// TOTP (RFC 6238) multi-factor auth, implemented on Node's built-in
// `crypto` only — no new dependency was needed since the app already
// ships `qrcode` (used at the API layer to render the enrollment QR).
//
// Flow:
//   1. POST /api/account/mfa/setup   -> generate + store a pending secret,
//      return an otpauth:// URI + QR code. Not yet enabled.
//   2. POST /api/account/mfa/enable  -> user submits the code their
//      authenticator app shows; if it checks out, mfa_enabled flips to
//      true and one-time backup codes are issued (shown once, stored
//      hashed).
//   3. From then on, src/lib/auth.ts requires a valid TOTP (or backup
//      code) on every sign-in for that user.

import crypto from "node:crypto";
import bcrypt from "bcryptjs";

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const TOTP_STEP_SECONDS = 30;
const TOTP_DIGITS = 6;
// How many steps before/after "now" still count as valid — absorbs clock
// drift and the few seconds it takes a person to type the code.
const TOTP_WINDOW = 1;

// ── Base32 (RFC 4648, no padding) ────────────────────────────────

function base32Encode(buffer: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];

  for (const char of clean) {
    const idx = BASE32_ALPHABET.indexOf(char);
    if (idx === -1) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

// ── Secret + otpauth:// URI ──────────────────────────────────────

/** A fresh random TOTP seed, base32-encoded (20 bytes, the RFC 4226 default). */
export function generateTotpSecret(): string {
  return base32Encode(crypto.randomBytes(20));
}

/**
 * Builds the otpauth:// URI an authenticator app scans as a QR code.
 * `accountLabel` should uniquely identify the user (their username).
 */
export function buildOtpauthUrl(secret: string, accountLabel: string, issuer = "Brgy-RMS"): string {
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(TOTP_DIGITS),
    period: String(TOTP_STEP_SECONDS),
  });
  const label = encodeURIComponent(`${issuer}:${accountLabel}`);
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ── HOTP / TOTP (RFC 4226 / RFC 6238) ────────────────────────────

function hotp(secret: string, counter: number): string {
  const key = base32Decode(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(counterBuffer).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  const code = (binary % 10 ** TOTP_DIGITS).toString().padStart(TOTP_DIGITS, "0");
  return code;
}

function currentStep(forTime = Date.now()): number {
  return Math.floor(forTime / 1000 / TOTP_STEP_SECONDS);
}

/** Verifies a 6-digit code against `secret`, tolerating ±1 step of clock drift. */
export function verifyTotp(secret: string, token: string): boolean {
  const cleanToken = token.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(cleanToken)) return false;

  const step = currentStep();
  for (let errorWindow = -TOTP_WINDOW; errorWindow <= TOTP_WINDOW; errorWindow++) {
    if (hotp(secret, step + errorWindow) === cleanToken) return true;
  }
  return false;
}

// ── Backup codes ──────────────────────────────────────────────────

/** Generates `count` human-typeable one-time recovery codes, e.g. "7F3K-9QRT". */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const raw = crypto.randomBytes(5).toString("hex").toUpperCase().slice(0, 8);
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/** Hashes backup codes for storage — never persist the plaintext versions. */
export async function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((code) => bcrypt.hash(code, 10)));
}

/**
 * Checks `token` against a list of hashed backup codes. If it matches,
 * returns the remaining list with that code removed (single-use) so the
 * caller can persist it — a matched backup code must never be reusable.
 */
export async function consumeBackupCode(
  token: string,
  hashedCodes: string[]
): Promise<{ valid: boolean; remaining: string[] }> {
  const cleanToken = token.trim().toUpperCase();

  for (let i = 0; i < hashedCodes.length; i++) {
    if (await bcrypt.compare(cleanToken, hashedCodes[i])) {
      const remaining = [...hashedCodes];
      remaining.splice(i, 1);
      return { valid: true, remaining };
    }
  }
  return { valid: false, remaining: hashedCodes };
}