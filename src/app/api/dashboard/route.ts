// FILE: src/app/api/dashboard/route.ts
//
// SECURITY FIX: this route was gated by a single `requirePermission("residents:read")`
// check, but the response bundled in data that requires much narrower
// permissions than that — most seriously `recentActivity`, which is the
// 10 most recent AUDIT LOG entries (who did what, when). Audit logs are
// supposed to require "audit-logs:read" (only ADMIN/CAPTAIN hold that —
// not even SECRETARY), yet almost every role has "residents:read", so
// BHW/ENCODER/KAGAWAD/SECRETARY could all read the full audit trail
// through this one dashboard call. The same problem applied to
// `recentBlotterCases`/`activeCases`/`settledCases` (needs "blotter:read"),
// certificate counts + `documentsByStatus` (needs "certificates:read"),
// `visitorsActive` (needs "visitors:read"), `meetingsToday` (needs
// "meetings:read"), and `totalAssets`/`borrowedEquipment` (needs
// "equipment:read").
//
// Fix: keep the single auth check for the base "you're allowed on the
// dashboard at all" gate, but scope each section's data to whether the
// caller's role actually holds the permission that section represents.
// Sections the role can't see come back as safe empty defaults (0 / [] /
// null) rather than being omitted — the frontend already treats those as
// "nothing to show" (see dashboard/page.tsx's `.length === 0` checks), so
// no shape changes are needed there.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/permission";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async () => {
  const auth = await requirePermission("dashboard:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const role = (auth.session.user as any)?.role as string;

  const canReadBlotter = hasPermission(role, "blotter:read");
  const canReadCertificates = hasPermission(role, "certificates:read");
  const canReadVisitors = hasPermission(role, "visitors:read");
  const canReadMeetings = hasPermission(role, "meetings:read");
  const canReadEquipment = hasPermission(role, "equipment:read");
  const canReadAuditLogs = hasPermission(role, "audit-logs:read");
  const canReadResidents = hasPermission(role, "residents:read");
  const canReadHouseholds = hasPermission(role, "households:read");

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
  // all 17 one-by-one. Each query below is additionally short-circuited to
  // a cheap default when the caller's role can't see that resource, so we
  // don't even pay the query cost for data we're about to withhold.
  const [totalResidents, totalHouseholds, activeCases, borrowedEquipment, certsThisMonth, certsThisYear] =
    await Promise.all([
      canReadResidents ? prisma.resident.count({ where: { is_archived: false } }) : Promise.resolve(0),
      canReadHouseholds ? prisma.household.count() : Promise.resolve(0),
      canReadBlotter
        ? prisma.blotterCase.count({ where: { status: { in: ["FILED", "ONGOING"] } } })
        : Promise.resolve(0),
      canReadEquipment
        ? prisma.equipmentBorrowing.count({ where: { actual_return: null } })
        : Promise.resolve(0),
      canReadCertificates
        ? prisma.certificate.count({ where: { issued_at: { gte: startOfMonth } } })
        : Promise.resolve(0),
      canReadCertificates
        ? prisma.certificate.count({ where: { issued_at: { gte: startOfYear } } })
        : Promise.resolve(0),
    ]);

  // ── Batch 11 (Dashboard Customization) widget counts ──
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTomorrow = new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000);

  const [documentRequestsPending, visitorsActive, meetingsToday, settledCases, totalAssets] =
    await Promise.all([
      canReadCertificates
        ? prisma.certificate.count({ where: { status: "PENDING" } }).catch(() => 0)
        : Promise.resolve(0),
      canReadVisitors
        ? prisma.visitorLog.count({ where: { time_out: null } }).catch(() => 0)
        : Promise.resolve(0),
      canReadMeetings
        ? prisma.meetingRecord.count({ where: { meeting_date: { gte: startOfToday, lt: startOfTomorrow } } }).catch(() => 0)
        : Promise.resolve(0),
      canReadBlotter
        ? prisma.blotterCase.count({ where: { status: { in: ["RESOLVED", "DISMISSED"] } } })
        : Promise.resolve(0),
      canReadEquipment ? prisma.equipment.count() : Promise.resolve(0),
    ]);

  const [residentsByPurok, residentsBySex, recentActivity, recentBlotterCases, documentsByStatus] =
    await Promise.all([
      canReadResidents
        ? prisma.resident.groupBy({ by: ["purok_id"], where: { is_archived: false }, _count: true })
        : Promise.resolve([]),
      canReadResidents
        ? prisma.resident.groupBy({ by: ["sex"], where: { is_archived: false }, _count: true })
        : Promise.resolve([]),
      canReadAuditLogs
        ? prisma.auditLog.findMany({
            take: 10,
            orderBy: { performed_at: "desc" },
            include: { user: { select: { username: true } } },
          })
        : Promise.resolve([]),
      canReadBlotter
        ? prisma.blotterCase.findMany({
            take: 5,
            orderBy: { created_at: "desc" },
            select: { id: true, case_number: true, complainant_name: true, respondent_name: true, status: true },
          })
        : Promise.resolve([]),
      canReadCertificates
        ? prisma.certificate.groupBy({ by: ["status"], _count: true }).catch(() => [])
        : Promise.resolve([]),
    ]);

  // ── Month-over-month comparison counts ──
  const [residentsThisMonth, residentsLastMonth, householdsThisMonth, householdsLastMonth] =
    await Promise.all([
      canReadResidents ? prisma.resident.count({ where: { created_at: { gte: startOfMonth } } }) : Promise.resolve(0),
      canReadResidents
        ? prisma.resident.count({ where: { created_at: { gte: startOfLastMonth, lt: startOfMonth } } })
        : Promise.resolve(0),
      canReadHouseholds ? prisma.household.count({ where: { created_at: { gte: startOfMonth } } }) : Promise.resolve(0),
      canReadHouseholds
        ? prisma.household.count({ where: { created_at: { gte: startOfLastMonth, lt: startOfMonth } } })
        : Promise.resolve(0),
    ]);

  const [certsLastMonth, equipmentThisMonth, equipmentLastMonth] =
    await Promise.all([
      canReadCertificates
        ? prisma.certificate.count({ where: { issued_at: { gte: startOfLastMonth, lt: startOfMonth } } })
        : Promise.resolve(0),
      canReadEquipment
        ? prisma.equipmentBorrowing.count({ where: { date_borrowed: { gte: startOfMonth } } })
        : Promise.resolve(0),
      canReadEquipment
        ? prisma.equipmentBorrowing.count({ where: { date_borrowed: { gte: startOfLastMonth, lt: startOfMonth } } })
        : Promise.resolve(0),
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
    // ── Batch 11 (Dashboard Customization) ──
    documentRequestsPending,
    visitorsActive,
    meetingsToday,
    settledCases,
    totalAssets,
    documentsByStatus: documentsByStatus.map((d: any) => ({ status: d.status, count: d._count })),
    trends: {
      residents:    canReadResidents ? pctChange(residentsThisMonth, residentsLastMonth) : null,
      households:   canReadHouseholds ? pctChange(householdsThisMonth, householdsLastMonth) : null,
      certsMonth:   canReadCertificates ? pctChange(certsThisMonth, certsLastMonth) : null,
      equipment:    canReadEquipment ? pctChange(equipmentThisMonth, equipmentLastMonth) : null,
    },
  });
});