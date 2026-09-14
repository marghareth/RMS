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