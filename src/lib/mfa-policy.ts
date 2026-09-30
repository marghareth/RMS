// FILE: src/lib/mfa-policy.ts
//
// Single source of truth for "which accounts must use two-factor auth".
//
// Deliberately dependency-free (no Prisma, no bcrypt, no Node APIs) so it
// can be imported from `middleware.ts`, which runs on the Edge runtime,
// as well as from auth.ts / session.ts.
//
// ADMIN and CAPTAIN hold the most sensitive permissions in the system
// (resident PII, financials, user management, backups), so they must have
// TOTP enabled. Enforcement is *not* a lockout: an account that hasn't
// enrolled yet can still sign in, but is confined to the enrollment page
// (/account/security) and its API until it finishes — see middleware.ts.
//
// Escape hatch: set MFA_ENFORCEMENT=off in the environment to fall back to
// the old "banner only" behavior (e.g. while rolling this out to a
// barangay whose admin doesn't have an authenticator app ready yet).

export const ROLES_REQUIRING_MFA: readonly string[] = ["ADMIN", "CAPTAIN"];

export function roleRequiresMfa(role: string | null | undefined): boolean {
  return !!role && ROLES_REQUIRING_MFA.includes(role);
}

/** True when the account must still enroll before using the rest of the app. */
export function mfaSetupRequired(role: string | null | undefined, mfaEnabled: boolean): boolean {
  return roleRequiresMfa(role) && !mfaEnabled;
}

export function isMfaEnforcementOn(): boolean {
  return (process.env.MFA_ENFORCEMENT ?? "on").toLowerCase() !== "off";
}

/**
 * Paths a not-yet-enrolled account may still reach while enforcement is on.
 * Everything else redirects (pages) or returns 403 (API) until MFA is set up.
 */
const MFA_SETUP_ALLOWED_PREFIXES = ["/account/security", "/api/account/mfa", "/access-denied"];

export function isAllowedDuringMfaSetup(pathname: string): boolean {
  return MFA_SETUP_ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}