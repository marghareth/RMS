// FILE: src/lib/auth.ts
//
// SECURITY: two layers here beyond a plain username/password check.
//
// 1. Login attempts are rate-limited (5 failures / 15 min per username)
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
import { verifyTotp, consumeBackupCode } from "./mfa";
import { RateLimiter } from "./rate-limit";

const loginLimiter = new RateLimiter({
  namespace: "login",
  max: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
});

const ROLES_REQUIRING_MFA = new Set(["ADMIN", "CAPTAIN"]);

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
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username;

        // Read-only gate: doesn't count as an attempt by itself, but
        // blocks entirely once too many *real* failures have already
        // been recorded for this username.
        const gate = await loginLimiter.peek(username);
        if (!gate.allowed) return null;

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.is_active) {
          // Pay the same bcrypt cost a real "wrong password" compare
          // would below, purely so this branch isn't distinguishable by
          // timing from that one — see note 3 at the top of this file.
          // The result is always false; it exists only to burn time.
          await bcrypt.compare(credentials.password, DUMMY_PASSWORD_HASH);
          await loginLimiter.penalize(username);
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!passwordMatch) {
          await loginLimiter.penalize(username);
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

          const validTotp = user.mfa_secret ? verifyTotp(user.mfa_secret, token) : false;

          if (!validTotp) {
            const { valid, remaining } = await consumeBackupCode(token, user.mfa_backup_codes);
            if (!valid) {
              await loginLimiter.penalize(username);
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

        await loginLimiter.reset(username);

        return {
          id: String(user.id),
          username: user.username,
          role: user.role,
          mfaSetupRequired: ROLES_REQUIRING_MFA.has(user.role) && !user.mfa_enabled,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.username = (user as any).username;
        token.role = (user as any).role;
        token.mfaSetupRequired = (user as any).mfaSetupRequired;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
        (session.user as any).mfaSetupRequired = token.mfaSetupRequired;
      }
      return session;
    },
  },
};