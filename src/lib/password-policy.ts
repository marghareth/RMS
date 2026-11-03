// FILE: src/lib/password-policy.ts
//
// One set of rules for every password a person chooses: a new account,
// changing your own password, and replacing a temporary password.
//
// Pure module (no Prisma, no Node APIs) so the same checks run in the
// browser, to show hints while typing, and on the server, which is the
// one that actually decides.

import { weakPasswordCandidates } from "./weak-passwords";

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;

/** How long a temporary password issued by an Admin or Secretary works. */
export const TEMP_PASSWORD_TTL_MS = 30 * 60 * 1000;

/** How long a "Forgot password?" request waits for approval before it lapses. */
export const RESET_REQUEST_TTL_MS = 24 * 60 * 60 * 1000;

export interface PasswordRule {
  id: string;
  label: string;
  ok: boolean;
}

/**
 * The rules shown under the field: 10 or more characters, with an
 * uppercase letter, a lowercase letter, a number and a symbol.
 */
export function passwordRules(password: string): PasswordRule[] {
  return [
    { id: "length", label: `${PASSWORD_MIN_LENGTH}+ characters`, ok: password.length >= PASSWORD_MIN_LENGTH },
    { id: "upper", label: "uppercase letter", ok: /[A-Z]/.test(password) },
    { id: "lower", label: "lowercase letter", ok: /[a-z]/.test(password) },
    { id: "number", label: "number", ok: /[0-9]/.test(password) },
    { id: "symbol", label: "symbol", ok: /[^A-Za-z0-9]/.test(password) },
  ];
}

/**
 * The first problem with this password, or null if it's acceptable.
 *
 * On top of the visible rules, one quiet check: the password can't contain
 * the username or be one of the well-known weak passwords (for example
 * "Barangay123!"). It isn't listed under the field because almost nobody
 * runs into it; it only shows up as an error if they do.
 */
export function passwordProblem(password: string, username = ""): string | null {
  if (password.length > PASSWORD_MAX_LENGTH) return `Use at most ${PASSWORD_MAX_LENGTH} characters.`;
  const missing = passwordRules(password).filter((r) => !r.ok);
  if (missing.length > 0) {
    if (missing[0].id === "length") return `Use at least ${PASSWORD_MIN_LENGTH} characters.`;
    return `Add ${missing.map((r) => (r.id === "upper" ? "an uppercase letter" : `a ${r.label}`)).join(", ").replace(/, ([^,]*)$/, " and $1")}.`;
  }
  const lower = password.toLowerCase();
  const name = username.trim().toLowerCase();
  if (name.length >= 3 && lower.includes(name)) return "Don't include your username in your password.";
  const weak = weakPasswordCandidates(name || "user").map((p) => p.toLowerCase());
  const stripped = lower.replace(/[^a-z0-9]+$/, "");
  if (weak.includes(lower) || weak.includes(stripped)) return "That password is too easy to guess. Try another.";
  return null;
}