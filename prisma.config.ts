// prisma.config.ts  (project root)
import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";

// `prisma generate` runs on every `npm install` (postinstall) and never
// connects to the database, but `env("DATABASE_URL")` throws when the
// variable is missing — which broke installs anywhere it isn't set (Vercel
// Preview deployments, CI). Fall back to an unreachable placeholder so
// generate works; commands that actually connect (migrate, db push, seed)
// still fail clearly against it.
const DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://DATABASE_URL-not-set@localhost:5432/missing";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/migrations/seed.ts",
  },
  datasource: {
    url: DATABASE_URL,
  },
});
