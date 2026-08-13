// FILE: src/lib/auth.ts
//
// SECURITY FIX: `authorize()` had no throttling at all — an attacker could
// fire unlimited password guesses at any username with no delay, lockout,
// or backoff (bcrypt.compare is deliberately slow, but that's not a
// substitute for real rate limiting at scale/with parallel requests).
//
// Added a simple in-memory sliding-window limiter keyed by username: after
// MAX_ATTEMPTS failed logins within WINDOW_MS, further attempts for that
// username are rejected for the rest of the window, independent of
// whether the password is actually correct.
//
// LIMITATION: this store is per-process memory, so it resets on restart
// and does NOT share state across multiple server instances/regions in a
// horizontally-scaled deployment. That's fine for a single-instance
// deployment (typical for a barangay-scale LGU system) but if this is
// ever run behind a load balancer with multiple Node instances, replace
// `attemptStore` with a shared store (e.g. Redis/Upstash) so the limit is
// enforced globally rather than per-instance.
import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "./db";
import bcrypt from "bcryptjs";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

type AttemptRecord = { count: number; firstAttemptAt: number };
const attemptStore = new Map<string, AttemptRecord>();

function isRateLimited(username: string): boolean {
  const record = attemptStore.get(username);
  if (!record) return false;

  const windowExpired = Date.now() - record.firstAttemptAt > WINDOW_MS;
  if (windowExpired) {
    attemptStore.delete(username);
    return false;
  }

  return record.count >= MAX_ATTEMPTS;
}

function recordFailedAttempt(username: string): void {
  const record = attemptStore.get(username);
  const windowExpired = record && Date.now() - record.firstAttemptAt > WINDOW_MS;

  if (!record || windowExpired) {
    attemptStore.set(username, { count: 1, firstAttemptAt: Date.now() });
    return;
  }

  record.count += 1;
}

function clearAttempts(username: string): void {
  attemptStore.delete(username);
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
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const username = credentials.username;

        // Deliberately generic rejection (no "too many attempts" detail)
        // so this branch is indistinguishable from a bad password to
        // anyone probing for valid usernames.
        if (isRateLimited(username)) return null;

        const user = await prisma.user.findUnique({
          where: { username },
        });

        if (!user || !user.is_active) {
          recordFailedAttempt(username);
          return null;
        }

        const passwordMatch = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!passwordMatch) {
          recordFailedAttempt(username);
          return null;
        }

        clearAttempts(username);

        return {
          id: String(user.id),
          username: user.username,
          role: user.role,
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
        (session.user as any).username = token.username;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
};