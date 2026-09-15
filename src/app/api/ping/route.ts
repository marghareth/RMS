// FILE: src/app/api/ping/route.ts
//
// KEEP-ALIVE ENDPOINT — prevents the Supabase free-tier project from
// auto-pausing after 7 days of inactivity.
//
// Supabase's "inactivity" clock is driven by DATABASE activity, not by
// whether the Next.js app itself is running — so simply having the app
// deployed does nothing on its own. Something has to actually issue a
// query against the DB on a schedule. That "something" is expected to be
// an external scheduler (e.g. a GitHub Actions cron job — see
// .github/workflows/keep-supabase-alive.yml) that calls this route
// periodically (daily is more than enough for a 7-day pause window).
//
// This route is intentionally:
//   - PUBLIC (no requireAuth/requirePermission) — a cron job has no
//     session/cookie to send, and there's nothing sensitive in the
//     response. It's exempted in middleware.ts alongside /login and
//     /verify.
//   - A trivial query ($queryRaw SELECT 1) rather than a real table
//     count — this only needs to touch the DB, not exercise the schema.
//     Swap in a real findFirst() if you'd rather see actual row data
//     while debugging.
//   - Not wrapped in withErrorHandling's generic 500 message, since the
//     one thing a monitor actually needs is to see *why* it failed.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      db: "reachable",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[GET /api/ping] Database unreachable:", err);
    return NextResponse.json(
      {
        status: "error",
        db: "unreachable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}