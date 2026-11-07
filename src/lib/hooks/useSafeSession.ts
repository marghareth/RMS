// FILE: src/lib/hooks/useSafeSession.ts
//
// BUILD FIX (Nov 2026): use this instead of next-auth's useSession().
//
// In a production build, next-auth's useSession() returns `undefined`
// (instead of throwing, as it does in development) whenever the component
// can't see a <SessionProvider> — and while Next.js pre-renders pages
// during `next build` on Vercel, that happened for the dashboard pages.
// Every caller did `const { data } = useSession()`, so the build crashed:
//
//   Error occurred prerendering page "/account/password"
//   TypeError: Cannot destructure property 'data' of '(0, e.useSession)(...)'
//   as it is undefined.
//
// This returns the same shape as useSession(), and while there's no
// session context yet, a "loading" session with no user — exactly what a
// signed-out first render already handles. In the browser the real
// session arrives a moment later as usual.
"use client";

import { useSession } from "next-auth/react";

type SessionResult = ReturnType<typeof useSession>;

const NO_SESSION_YET = {
  data: null,
  status: "loading",
  update: async () => null,
} as unknown as SessionResult;

export function useSafeSession(): SessionResult {
  const result = useSession() as SessionResult | undefined;
  return result ?? NO_SESSION_YET;
}