// FILE: tests/integration/setup/auth.ts
//
// Scope note: these tests mock `@/lib/session` (requirePermission /
// getSession) rather than driving a real NextAuth cookie/JWT through
// `getServerSession`. That machinery — login, TOTP, cookie encoding — is
// third-party (next-auth) plumbing with its own well-defined contract;
// what's actually project-specific and worth integration-testing for
// real is: does `hasPermission()` correctly gate each route, and does
// the route's *business logic* behave correctly against a real database.
// `src/lib/permission.test.ts` and `src/lib/auth.ts`'s own login flow
// cover the pieces this intentionally leaves out.
//
// Every *.integration.test.ts file mocks `@/lib/session` itself (vi.mock
// calls are hoisted by Vitest above imports, so they can't be re-exported
// from a shared helper module — this file only supplies the *shape* of a
// fake result to pass to `.mockResolvedValue(...)`), backed by a real
// User row's real id, so every recorded_by/issued_by/created_by column a
// route writes points at something that genuinely exists in the test
// database — no dangling FK a real Postgres would have rejected.

import type { Role } from "@prisma/client";

export function authedAs(user: { id: number }, role: Role) {
  return {
    session: {
      user: {
        id: String(user.id),
        username: `user-${user.id}`,
        role,
      },
      expires: new Date(Date.now() + 3600_000).toISOString(),
    },
  };
}

export const FORBIDDEN = { error: "Forbidden", status: 403 } as const;
export const UNAUTHORIZED = { error: "Unauthorized", status: 401 } as const;