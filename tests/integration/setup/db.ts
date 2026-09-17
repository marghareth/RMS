// FILE: tests/integration/setup/db.ts
//
// Real PrismaClient for integration tests, pointed at whatever
// DATABASE_URL vitest.integration.config.ts loaded from .env.test. Every
// route handler under test gets this exact instance injected via
// `vi.mock('@/lib/db', () => ({ prisma: testDb }))` at the top of each
// *.integration.test.ts file, so route code runs completely unmodified
// against a real database — no query builder is stubbed anywhere.
//
// ── Why cleanup-by-tracking instead of resetting the DB ────────────────
// The ask was explicit: `npm run test:integration` must never reset the
// database. Two more reasons this is also just the right design here,
// not merely a constraint:
//
//   1. Several routes (revenues, disbursements, incident-types,
//      deceased-records) call `prisma.$transaction([...])` themselves.
//      Wrapping each *test* in its own outer transaction and rolling it
//      back would mean nesting a real transaction inside that, which
//      Prisma does not support cleanly — it's a fragile foundation to
//      build 80+ route tests on.
//   2. AuditLog is append-only at the database level (see the
//      `audit_log_immutable` trigger in
//      prisma/migrations/20260913000000_add_mfa_and_immutable_audit_log).
//      Any DELETE or UPDATE against it fails by design. That means a
//      full-DB reset (`db push --force-reset`) is actually the *wrong*
//      tool for this schema, on top of being the wrong tool for "don't
//      touch my data" — a targeted approach is required either way.
//
// Instead, every factory in factories.ts registers exactly how to delete
// the row(s) it created via `trackCleanup()`. `cleanupCreatedRows()`
// (called from every test file's `afterEach`) unwinds that stack in
// reverse — children before parents, since a child is always created
// (and therefore pushed) after its parent — so foreign keys never block
// a cleanup step.
//
// One known, accepted exception: rows created by the *system under
// test* rather than a factory (e.g. the AuditLog row a route writes via
// logAudit(), or a User who has since appeared in one) can't be removed
// at all — the trigger above blocks it, and any User referenced by that
// audit row is then held in place by `ON DELETE RESTRICT` too. When that
// happens, the affected cleanup step logs a warning and moves on rather
// than failing the test; the row is simply left behind, exactly as it
// would be in production. This is expected and harmless in a disposable
// test database — see tests/integration/README.md.

import { PrismaClient } from "@prisma/client";

export const testDb = new PrismaClient();

type Cleanup = () => Promise<unknown>;
let cleanupStack: Cleanup[] = [];

/** Registers a teardown step. Called by factories.ts right after each insert. */
export function trackCleanup(fn: Cleanup) {
  cleanupStack.push(fn);
}

/**
 * Unwinds every cleanup registered since the last call, most-recently-
 * created row first. Call this from `afterEach` in every integration
 * test file — never from a global teardown, so a failing test's rows
 * don't leak into the next test.
 */
export async function cleanupCreatedRows() {
  const stack = cleanupStack;
  cleanupStack = [];

  for (let i = stack.length - 1; i >= 0; i--) {
    try {
      await stack[i]();
    } catch (err) {
      // Expected for rows pinned by the immutable-AuditLog trigger or an
      // ON DELETE RESTRICT FK from one — see the file comment above.
      // Anything else surfacing here is worth a look, so it's still
      // logged rather than swallowed silently.
      console.warn(
        "[integration cleanup] could not delete a test row (left in place):",
        err instanceof Error ? err.message : err
      );
    }
  }
}

export async function disconnectTestDb() {
  await testDb.$disconnect();
}