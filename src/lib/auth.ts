// FILE: src/lib/auth.ts
//
// SECURITY: two layers here beyond a plain username/password check.
//
// 1. Login attempts are rate-limited (5 failures / 15 min per username+IP, with looser
//    per-IP and per-username backstops — see LOGIN_WINDOW_MS below)
//    via the shared limiter in src/lib/rate-limit.ts — see that file for
//    why the storage layer is a swappable interface rather than a bare
//    Map, which is what this used to be. Only real failures (bad
//    password, bad MFA code) are penalized; the "please enter your MFA
//    code" round-trip on an otherwise-correct login is not, via
//    `peek`/`penalize` instead of a single unconditional increment.
//
// 2. TOTP multi-factor auth (src/lib/mfa.ts). Any user can enable it via
//    /api/account/mfa/*; once `mfa_enabled` is true on their row, a valid
//    6-digit code (or a one-time backup code) is required on every
//    sign-in, not just the password. ADMIN and CAPTAIN carry the most
//    sensitive permissions in this app (financials, blotter, resident
//    PII), so those roles are nudged hard to enable it — see
//    `mfaSetupRequired` below and the banner in the dashboard layout that
//    reads it off the session — but existing admins are never locked out
//    of an account they haven't enrolled yet; that would turn a security
//    feature into a self-inflicted outage with no recovery path.
//
// 3. BUGFIX — username-enumeration timing side-channel: the "user not
//    found / inactive" branch used to `return` immediately, while a
//    known username fell through to `bcrypt.compare(...)`, which is
//    deliberately slow (that's the whole point of bcrypt). Those two
//    branches therefore finished in measurably different times — fast
//    for "no such user", slow for "user exists, wrong password" —
//    letting an attacker script a login attempt per candidate username
//    and tell which ones are real purely from response latency, no
//    account lockout or password guess required. Fixed by running a
//    throwaway `bcrypt.compare` against `DUMMY_PASSWORD_HASH` on that
//    branch too, so both paths pay the same bcrypt cost before
//    returning. It can never match a real login (the hash isn't tied to
//    any account), so this only affects timing, not behavior.
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";
import { matchTotpStep, consumeBackupCode } from "./mfa";
import { RateLimiter, getClientIp } from "./rate-limit";
import { mfaSetupRequired } from "./mfa-policy";
import { describeDbError } from "./db-errors";
import { signedInBeforePasswordChange } from "./password-change";

// SECURITY FIX: login used to be limited by username alone, so anyone
// could lock any account (including `admin`) out indefinitely by sending
// five wrong passwords every 15 minutes — no knowledge needed beyond the
// username. Now three limits apply, and a login is refused if any is hit:
//   - username + IP: the tight one (5). An attacker exhausting it only
//     locks *their own* IP out of that account, not the real user.
//   - IP alone (50): stops one address spraying many usernames.
//   - username alone (100): backstop against a brute force spread across
//     many IPs. Much higher, so locking someone out this way takes 20×
//     the effort it used to.
// Only real failures count (see peek/penalize in rate-limit.ts).
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const loginPairLimiter = new RateLimiter({ namespace: "login", max: 5, windowMs: LOGIN_WINDOW_MS });
const loginIpLimiter = new RateLimiter({ namespace: "login-ip", max: 50, windowMs: LOGIN_WINDOW_MS });
const loginUserLimiter = new RateLimiter({ namespace: "login-user", max: 100, windowMs: LOGIN_WINDOW_MS });

/** next-auth hands authorize() a plain headers object, not a Request. */
function clientIpFrom(req: { headers?: Record<string, unknown> } | undefined): string {
  const headers = new Headers();
  for (const [k, v] of Object.entries(req?.headers ?? {})) {
    if (typeof v === "string") headers.set(k, v);
    else if (Array.isArray(v)) headers.set(k, v.join(", "));
  }
  return getClientIp(new Request("http://localhost", { headers }));
}

function loginLimitKeys(username: string, ip: string) {
  return [
    [loginPairLimiter, `${username}|${ip}`],
    [loginIpLimiter, ip],
    [loginUserLimiter, username],
  ] as const;
}

async function loginBlocked(username: string, ip: string): Promise<boolean> {
  const results = await Promise.all(loginLimitKeys(username, ip).map(([l, k]) => l.peek(k)));
  return results.some((r) => !r.allowed);
}

async function penalizeLogin(username: string, ip: string): Promise<void> {
  await Promise.all(loginLimitKeys(username, ip).map(([l, k]) => l.penalize(k)));
}

// How often (ms) a live session re-reads role / is_active / mfa_enabled from
// the database. The JWT itself is only a cache of those values — see
// `jwt` callback below and `getSession` in session.ts (which re-checks on
// every API request, so this interval only bounds how stale the *page
// guards in middleware* can be, not API authorization).
const TOKEN_REFRESH_MS = 60 * 1000;

// Computed once at module load, not per-request — bcrypt hashing is the
// expensive part, so this just needs to exist, not be regenerated. It
// isn't, and never was, a real user's password hash; nothing this string
// hashes to could ever match a real account's stored hash. Its only job
// is to give `authorize()` something to run `bcrypt.compare` against on
// the "no such user" branch so that branch costs the same as a genuine
// wrong-password compare — see note 3 above.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(
  "timing-side-channel-mitigation-only-not-a-real-account",
  10
);

/**
 * Records `step` as the account's last-used TOTP step, but only if it is
 * newer than what's stored. Returns false when another request already
 * claimed this (or a later) step — i.e. the code is being replayed.
 */
async function claimTotpStep(userId: number, step: number): Promise<boolean> {
  const { count } = await prisma.user.updateMany({
    where: { id: userId, OR: [{ mfa_last_step: null }, { mfa_last_step: { lt: step } }] },
    data: { mfa_last_step: step },
  });
  return count === 1;
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        // Populated on the second step of login, only when the account
        // has MFA enabled. Absent for every other sign-in.
        totp: { label: "Authentication code", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username;

        // Read-only gate: doesn't count as an attempt by itself, but
        // blocks entirely once too many *real* failures have already
        // been recorded (see loginLimitKeys above).
        const ip = clientIpFrom(req);
        if (await loginBlocked(username, ip)) return null;

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.is_active) {
          // Pay the same bcrypt cost a real "wrong password" compare
          // would below, purely so this branch isn't distinguishable by
          // timing from that one — see note 3 at the top of this file.
          // The result is always false; it exists only to burn time.
          await bcrypt.compare(credentials.password, DUMMY_PASSWORD_HASH);
          await penalizeLogin(username, ip);
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!passwordMatch) {
          await penalizeLogin(username, ip);
          return null;
        }

        // ── Second factor ──────────────────────────────────────────
        if (user.mfa_enabled) {
          const token = credentials.totp?.trim();

          // No code submitted yet: this is the first-step form post.
          // Signal the client to prompt for one and re-submit, rather
          // than treating it as a failed login (and without penalizing
          // the rate limiter for it — the password was correct).
          if (!token) {
            throw new Error("MFA_REQUIRED");
          }

          // Reject codes at or before the last accepted step (replay), and
          // claim this step atomically so two concurrent logins can't both
          // spend the same code.
          const step = user.mfa_secret ? matchTotpStep(user.mfa_secret, token, user.mfa_last_step) : null;
          const validTotp = step !== null && (await claimTotpStep(user.id, step));

          if (!validTotp) {
            const { valid, remaining } = await consumeBackupCode(token, user.mfa_backup_codes);
            if (!valid) {
              await penalizeLogin(username, ip);
              throw new Error("MFA_INVALID");
            }
            // Backup codes are single-use — persist the code's removal
            // immediately so it can't be replayed.
            await prisma.user.update({
              where: { id: user.id },
              data: { mfa_backup_codes: remaining },
            });
          }
        }

        // Only the pair counter is cleared: the per-IP and per-username
        // counters may hold an attacker's failures, which one good login
        // by the real user shouldn't wipe.
        await loginPairLimiter.reset(`${username}|${ip}`);

        return {
          id: String(user.id),
          username: user.username,
          role: user.role,
          mfaSetupRequired: mfaSetupRequired(user.role, user.mfa_enabled),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        token.username = user.username;
        token.role = user.role;
        token.mfaSetupRequired = user.mfaSetupRequired;
        // Only set on an actual sign-in (the `user` param is only passed
        // here at that point, never on a later token read/refresh), so the
        // client can tell "brand-new login" apart from "same session,
        // page reloaded" — used by the "always show tutorial on login"
        // onboarding preference in OnboardingProvider.tsx.
        token.loginAt = Date.now();
        token.checkedAt = Date.now();
        token.invalid = false;
        return token;
      }

      // SECURITY: role, is_active and mfa_enabled used to be frozen into
      // the JWT at sign-in and never looked at again, so demoting or
      // deactivating a user did nothing until their token expired (30
      // days by default). Re-read them periodically, and immediately when
      // the client calls `useSession().update()` (done after MFA
      // enrollment so the "you must enable MFA" gate lifts right away).
      const stale = !token.checkedAt || Date.now() - token.checkedAt > TOKEN_REFRESH_MS;
      if ((trigger === "update" || stale) && token.id) {
        try {
          const fresh = await prisma.user.findUnique({
            where: { id: parseInt(token.id) },
            select: { role: true, is_active: true, mfa_enabled: true, username: true, password_changed_at: true },
          });
          if (!fresh || !fresh.is_active || signedInBeforePasswordChange(token.loginAt, fresh.password_changed_at)) {
            token.invalid = true;
          } else {
            token.invalid = false;
            token.role = fresh.role;
            token.username = fresh.username;
            token.mfaSetupRequired = mfaSetupRequired(fresh.role, fresh.mfa_enabled);
          }
          token.checkedAt = Date.now();
        } catch (err) {
          // DB hiccup: keep the existing token rather than logging everyone
          // out. API routes re-verify against the DB on every request
          // anyway (session.ts), so this fails safe for authorization.
          // warn, not error: this is handled, and console.error would pop
          // Next's red dev overlay as if the app had crashed.
          console.warn("[auth] token refresh skipped — database unreachable:", describeDbError(err));
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id;
        session.user.username = token.username;
        session.user.role = token.role;
        session.user.mfaSetupRequired = token.mfaSetupRequired;
        session.user.loginAt = token.loginAt;
      }
      return session;
    },
  },
};