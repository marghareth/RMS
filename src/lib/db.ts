// FILE: src/lib/db.ts
//
// LOGGING FIX: this previously passed `log: ["query"]` unconditionally,
// so every single Prisma query — including ones fired internally for
// nested `include`s, like the Purok/Household/Certificate/HealthRecord/
// etc. lookups behind a single GET /api/residents/:id — got printed to
// stdout. That's the wall of `prisma:query ...` lines flooding the
// terminal on every request; it's Prisma doing exactly what it was told,
// just too verbose for normal day-to-day dev use, and it also ran in
// production (a minor info-leak: full SQL text, including bound
// parameter placeholders, in prod logs).
//
// Fixed by making it opt-in: query logging only turns on when
// DEBUG_PRISMA=1 is set, so it's available when you actually need to
// debug a slow query but silent by default. Still logs warnings/errors
// always, in every environment, since those matter regardless.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.DEBUG_PRISMA === "1"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;