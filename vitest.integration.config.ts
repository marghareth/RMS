// FILE: vitest.integration.config.ts
//
// Separate project from vitest.config.ts (unit tests, real DB mocked out
// via vitest.setup.ts). These tests hit a REAL Postgres database
// end-to-end: route handler -> prisma -> Postgres -> back out.
//
//   1. They need DATABASE_URL pointing at a disposable test database —
//      never your dev database, never one with data you care about.
//      Copy .env.test.example to .env.test and fill it in.
//   2. They do NOT run `prisma db push --force-reset`, `migrate reset`,
//      or any TRUNCATE. Each test creates only the rows it needs (via
//      tests/integration/setup/factories.ts) and deletes exactly those
//      rows again in `afterEach` — see setup/db.ts for the full cleanup
//      model, including the couple of cases (append-only AuditLog rows)
//      that are left behind on purpose. Run this suite as many times as
//      you like; schema and pre-existing data are never touched.
//   3. Schema must already be applied to that database — run
//      `npm run test:integration:migrate` once, and again after any
//      schema change. It wraps `prisma migrate deploy`, which only ever
//      *applies* pending migrations, never resets or drops data.
//
// See tests/integration/README.md for the full setup walkthrough.

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";
import { loadEnvFile } from "./tests/integration/setup/env";

loadEnvFile(".env.test");

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["**/*.integration.test.ts"],
    exclude: ["**/node_modules/**", "**/dist/**", "tests/example.spec.ts", "**/e2e/**"],
    // These tests share one real database and mutate real (if scoped and
    // cleaned-up) rows — running files in parallel risks two suites
    // racing each other's row-counting logic (certificate_no/
    // queue_number/household_no all count existing rows) or cleanup.
    fileParallelism: false,
    hookTimeout: 30_000,
    testTimeout: 30_000,
    globalSetup: ["./tests/integration/setup/globalSetup.ts"],
  },
});