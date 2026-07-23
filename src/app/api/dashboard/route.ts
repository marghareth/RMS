// FILE PATH: src/app/api/dashboard/route.ts
// Replace the entire contents of this file with the code below.
//
// WHAT WAS WRONG: this route already existed and already computed real
// totals (totalResidents, totalHouseholds, activeCases, etc.) — that part
// was fine. The problem was entirely on the frontend: the dashboard PAGE
// (src/app/(dashboard)/dashboard/page.tsx) never called this endpoint at
// all. It rendered six stat cards and two "recent" panels from hardcoded
// arrays (const stats = [...], const recentBlotter = [...], const
// recentActivity = [...]) with fixed numbers like "2,847" residents and
// "+12.5%" trends that never changed no matter what was in the database.
//
// This file adds two things the page needs that the old route didn't
// return:
//   1. recentBlotterCases — the 5 most recent blotter cases, for the
//      "Recent Blotter Cases" panel (previously hardcoded).
//   2. Real month-over-month trend data (this month's count vs last
//      month's count) for residents, households, certificates issued,
//      and equipment borrowed — so the trend arrows/percentages on the
//      stat cards can reflect the database instead of being fabricated.
//      "Active Blotter Cases" has no meaningful monthly trend (it's a
//      live snapshot, not something with a natural month-over-month
//      count), so no trend is computed for it — the frontend just won't
//      show a trend badge on that card.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";

export async function GET() {
  const auth = await requirePermission("residents:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const now = new Date();
  const startOfMonth      = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth  = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const startOfYear       = new Date(now.getFullYear(), 0, 1);

  // NOTE ON BATCHING: this route needs ~17 separate counts/queries to build
  // the dashboard. Firing all 17 at once via a single Promise.all() opens
  // that many concurrent DB connections — which is enough to exceed a
  // pooler's session-mode connection limit (e.g. "max clients reached...
  // pool_size: 15"), especially with other requests also holding
  // connections. Splitting into smaller sequential batches keeps peak
  // concurrent connections low while still being far faster than running
  // all 17 one-by-one.
  const [totalResidents, totalHouseholds, activeCases, borrowedEquipment, certsThisMonth, certsThisYear] =
    await Promise.all([
      prisma.resident.count({ where: { is_archived: false } }),
      prisma.household.count(),
      prisma.blotterCase.count({ where: { status: { in: ["FILED", "ONGOING"] } } }),
      prisma.equipmentBorrowing.count({ where: { actual_return: null } }),
      prisma.certificate.count({ where: { issued_at: { gte: startOfMonth } } }),
      prisma.certificate.count({ where: { issued_at: { gte: startOfYear } } }),
    ]);

  const [residentsByPurok, residentsBySex, recentActivity, recentBlotterCases] =
    await Promise.all([
      prisma.resident.groupBy({
        by: ["purok_id"],
        where: { is_archived: false },
        _count: true,
      }),
      prisma.resident.groupBy({
        by: ["sex"],
        where: { is_archived: false },
        _count: true,
      }),
      prisma.auditLog.findMany({
        take: 10,
        orderBy: { performed_at: "desc" },
        include: { user: { select: { username: true } } },
      }),
      prisma.blotterCase.findMany({
        take: 5,
        orderBy: { created_at: "desc" },
        select: { id: true, case_number: true, complainant_name: true, respondent_name: true, status: true },
      }),
    ]);

  // ── Month-over-month comparison counts ──
  const [residentsThisMonth, residentsLastMonth, householdsThisMonth, householdsLastMonth] =
    await Promise.all([
      prisma.resident.count({ where: { created_at: { gte: startOfMonth } } }),
      prisma.resident.count({ where: { created_at: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.household.count({ where: { created_at: { gte: startOfMonth } } }),
      prisma.household.count({ where: { created_at: { gte: startOfLastMonth, lt: startOfMonth } } }),
    ]);

  const [certsLastMonth, equipmentThisMonth, equipmentLastMonth] =
    await Promise.all([
      prisma.certificate.count({ where: { issued_at: { gte: startOfLastMonth, lt: startOfMonth } } }),
      prisma.equipmentBorrowing.count({ where: { date_borrowed: { gte: startOfMonth } } }),
      prisma.equipmentBorrowing.count({ where: { date_borrowed: { gte: startOfLastMonth, lt: startOfMonth } } }),
    ]);

  // % change helper. Returns null when there's no prior-month baseline to
  // compare against (0 last month) — the frontend shows "New" instead of
  // a misleading infinite/undefined percentage in that case.
  function pctChange(current: number, previous: number): number | null {
    if (previous === 0) return current > 0 ? null : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  return NextResponse.json({
    totalResidents,
    totalHouseholds,
    activeCases,
    borrowedEquipment,
    certsThisMonth,
    certsThisYear,
    residentsByPurok,
    residentsBySex,
    recentActivity,
    recentBlotterCases,
    trends: {
      residents:    pctChange(residentsThisMonth, residentsLastMonth),
      households:   pctChange(householdsThisMonth, householdsLastMonth),
      certsMonth:   pctChange(certsThisMonth, certsLastMonth),
      equipment:    pctChange(equipmentThisMonth, equipmentLastMonth),
    },
  });
}