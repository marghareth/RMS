// FILE: src/lib/db-errors.ts
//
// Prisma's connection errors are ~10 lines long (a code frame of the
// compiled bundle plus advice). That's useless noise in the terminal and,
// when logged with console.error, triggers Next's red dev overlay as though
// the app had crashed. Callers that *handle* a database outage (the
// session refresh, the root page) log this one-liner with console.warn.

/** One-line, host-free-ish summary of a database error. */
export function describeDbError(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  // The informative line is the one Prisma writes itself ("Can't reach
  // database server at …", "Timed out fetching a new connection …").
  const useful =
    lines.find((l) => /can't reach|timed out|connection|authentication|tenant or user/i.test(l)) ??
    lines[lines.length - 1] ??
    "unknown database error";
  return useful.slice(0, 200);
}