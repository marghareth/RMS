// FILE: src/lib/session.ts
//
// SECURITY: the session used to be read straight out of the JWT, so
// `role` and `is_active` were whatever they were at sign-in — demoting or
// deactivating a user changed nothing until their token expired. Every
// session now goes through `revalidate()`, which re-reads the account from
// the database (short-cached, see USER_CACHE_TTL_MS) and:
//   - returns null if the account was deleted or deactivated,
//   - overwrites role / username with the current database values,
//   - recomputes `mfaSetupRequired` from the current mfa_enabled flag.
// The JWT is therefore only proof of *who* the caller is, never of what
// they're allowed to do.
import { getServerSession, type Session } from "next-auth";
import { getToken } from "next-auth/jwt";
import type { NextRequest } from "next/server";
import { authOptions } from "./auth";
import { prisma } from "./db";
import { hasPermission } from "./permission";
import { mfaSetupRequired, isMfaEnforcementOn } from "./mfa-policy";
import { signedInBeforePasswordChange } from "./password-change";

/**
 * How long a looked-up account is trusted before the next request re-reads
 * it. Bounds how long a deactivation/demotion can lag on a warm instance;
 * kept small since it only exists to avoid one extra primary-key lookup
 * per call when a page fans out many parallel API requests.
 */
const USER_CACHE_TTL_MS = 5_000;

type CurrentUser = {
  role: string;
  username: string;
  is_active: boolean;
  mfa_enabled: boolean;
  password_changed_at: Date | null;
};
const userCache = new Map<number, { at: number; user: CurrentUser | null }>();

/** Test helper / manual invalidation. */
export function clearSessionUserCache() {
  userCache.clear();
}

async function loadCurrentUser(id: number): Promise<CurrentUser | null> {
  const hit = userCache.get(id);
  if (hit && Date.now() - hit.at < USER_CACHE_TTL_MS) return hit.user;

  const user = await prisma.user.findUnique({
    where: { id },
    select: { role: true, username: true, is_active: true, mfa_enabled: true, password_changed_at: true },
  });
  userCache.set(id, { at: Date.now(), user });
  return user;
}

async function revalidate(session: Session | null): Promise<Session | null> {
  if (!session?.user?.id) return null;
  const id = parseInt(session.user.id);
  if (Number.isNaN(id)) return null;

  const current = await loadCurrentUser(id);
  if (!current || !current.is_active) return null;
  if (signedInBeforePasswordChange(session.user.loginAt, current.password_changed_at)) return null;

  session.user.role = current.role;
  session.user.username = current.username;
  session.user.mfaSetupRequired = mfaSetupRequired(current.role, current.mfa_enabled);
  return session;
}

export async function getSession(req?: NextRequest) {
  if (req) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token || token.invalid) return null;
    return revalidate({
      user: {
        id: String(token.id),
        username: token.username as string,
        role: token.role as string,
        mfaSetupRequired: token.mfaSetupRequired,
        loginAt: token.loginAt,
      },
      expires: new Date((token.exp as number) * 1000).toISOString(),
    } as Session);
  }

  return revalidate(await getServerSession(authOptions));
}

/**
 * Signed in, any role. Like requirePermission, this also refuses an
 * ADMIN/CAPTAIN who hasn't enrolled in MFA yet (previously it didn't, so
 * routes using it — search, branding, barangay-info — relied on the
 * middleware alone). The MFA enrollment endpoints themselves pass
 * `{ allowDuringMfaSetup: true }`, since that's how the user gets out of
 * this state.
 */
export async function requireAuth(options: { allowDuringMfaSetup?: boolean } = {}) {
  const session = await getSession();
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }
  if (!options.allowDuringMfaSetup && session.user.mfaSetupRequired && isMfaEnforcementOn()) {
    return { error: "MFA_SETUP_REQUIRED", status: 403 };
  }
  return { session };
}

export async function requirePermission(
  permission: Parameters<typeof hasPermission>[1],
  req?: NextRequest
) {
  const session = await getSession(req);
  if (!session) {
    return { error: "Unauthorized", status: 401 };
  }

  const role = session.user.role;

  if (!role || !hasPermission(role, permission)) {
    return { error: "Forbidden", status: 403 };
  }

  // Defense in depth for the middleware gate: an ADMIN/CAPTAIN who hasn't
  // enrolled in MFA can't use the API directly either, only the
  // enrollment endpoints (which use requireAuth, not this).
  if (session.user.mfaSetupRequired && isMfaEnforcementOn()) {
    return { error: "MFA_SETUP_REQUIRED", status: 403 };
  }

  return { session };
}