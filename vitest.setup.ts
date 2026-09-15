// FILE: vitest.setup.ts
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// ── Global @prisma/client shim ──────────────────────────────────────────
// `src/lib/api-handler.ts` (used by every API route via withErrorHandling)
// does `err instanceof Prisma.PrismaClientKnownRequestError` on every
// thrown error, including plain ApiError/Error instances that have
// nothing to do with Prisma. That means `Prisma.PrismaClientKnownRequestError`
// must exist and be a real constructor for ANY route test to run at all,
// even ones that never touch the database.
//
// Normally `prisma generate` (run automatically via @prisma/client's
// postinstall hook) produces those classes as part of the generated
// client. In environments where that can't run (e.g. no network access
// to Prisma's engine-binary host), `@prisma/client`'s `Prisma` namespace
// falls back to a pre-generate stub that's missing them, and every route
// test would fail with "Right-hand side of 'instanceof' is not an
// object" the moment a route throws anything.
//
// The two classes actually live in `@prisma/client/runtime/library`
// independent of code generation — a real generated client just
// re-exports them unchanged — so we expose them here globally. This is a
// no-op in environments where `prisma generate` already ran successfully
// (same classes either way) and a necessary fix where it didn't.
vi.mock('@prisma/client', async () => {
  const lib = await import('@prisma/client/runtime/library');
  return {
    Prisma: {
      PrismaClientKnownRequestError: lib.PrismaClientKnownRequestError,
      PrismaClientValidationError: lib.PrismaClientValidationError,
      PrismaClientInitializationError: lib.PrismaClientInitializationError,
      PrismaClientRustPanicError: lib.PrismaClientRustPanicError,
    },
    // `src/lib/db.ts` imports `PrismaClient` from here, but every test
    // mocks `@/lib/db` directly instead of letting it construct a real
    // client, so this stub is never actually invoked.
    PrismaClient: class {
      constructor() {
        throw new Error(
          'PrismaClient should never be instantiated in unit tests — mock "@/lib/db" instead.'
        );
      }
    },
  };
});