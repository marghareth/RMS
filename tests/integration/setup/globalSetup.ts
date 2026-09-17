// FILE: tests/integration/setup/globalSetup.ts
//
// Runs once, before any integration test file, in Vitest's `globalSetup`
// phase. Its only job is a safety check: every test in this suite issues
// real INSERT/UPDATE/DELETE statements, so this refuses to even start if
// DATABASE_URL doesn't look like a disposable test database.
//
// This does NOT create, migrate, or reset anything — see
// `npm run test:integration:migrate` (scripts/test-db-migrate.ts) for the
// one-time/after-schema-change step that applies migrations. Nothing in
// this test suite ever calls `db push --force-reset`, `migrate reset`, or
// a TRUNCATE.

import { loadEnvFile } from "./env";

export default function setup() {
  loadEnvFile(".env.test");

  const url = process.env.DATABASE_URL;

  if (!url) {
    throw new Error(
      "\n\nDATABASE_URL is not set.\n" +
        "  1. Copy .env.test.example to .env.test\n" +
        "  2. Point it at a disposable Postgres database (e.g. brgy_rms_test)\n" +
        "  3. Run `npm run test:integration:migrate` once\n" +
        "  4. Re-run `npm run test:integration`\n"
    );
  }

  if (!/test/i.test(url)) {
    const redacted = url.replace(/:[^:@/]*@/, ":****@");
    throw new Error(
      "\n\nRefusing to run integration tests: DATABASE_URL does not contain " +
        `the word "test" (got: ${redacted}).\n` +
        "This check exists so this suite can never accidentally run against " +
        "a dev/staging/production database — it creates and deletes real " +
        "rows. Point DATABASE_URL (in .env.test) at a database named " +
        'something like "brgy_rms_test" instead.\n'
    );
  }
}