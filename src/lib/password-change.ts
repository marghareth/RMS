// FILE: src/lib/password-change.ts
//
// Shared by the jwt callback (src/lib/auth.ts) and API session checks
// (src/lib/session.ts), which can't import each other.

/**
 * True when the session was started before the account's password was
 * last changed — resetting a password must end every session that was
 * opened with the old one (e.g. a stolen cookie). Sessions with no
 * recorded sign-in time predate this check and are treated as old.
 */
export function signedInBeforePasswordChange(loginAt: number | undefined, passwordChangedAt: Date | null): boolean {
  if (!passwordChangedAt) return false;
  return !loginAt || loginAt < passwordChangedAt.getTime();
}
