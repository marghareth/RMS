// FILE: scripts/test-db-migrate.ts
//
// Applies pending Prisma migrations to the integration test database
// defined in .env.test. Deliberately uses `prisma migrate deploy` — not
// `db push --force-reset` and not `migrate dev` — because `deploy` only
// ever applies migrations that haven't run yet. It never drops a table,
// never resets data, and never prompts for confirmation, so re-running
// this after every schema change is always safe. The integration test
// run itself (`npm run test:integration`) never touches schema at all.
import { execSync } from "node:child_process";
import { loadEnvFile } from "../tests/integration/setup/env";

loadEnvFile(".env.test");

const url = process.env.DATABASE_URL;

if (!url) {
  console.error(
    "DATABASE_URL is not set. Copy .env.test.example to .env.test first."
  );
  process.exit(1);
}

if (!/test/i.test(url)) {
  console.error(
    'Refusing to migrate a database whose URL doesn\'t contain "test". ' +
      "Point .env.test at a dedicated test database (e.g. brgy_rms_test)."
  );
  process.exit(1);
}

console.log("Applying migrations to the integration test database...");
execSync("npx prisma migrate deploy", { stdio: "inherit", env: process.env });
console.log("Done.");