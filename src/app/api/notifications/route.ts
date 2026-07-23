// FILE PATH: src/app/api/notifications/route.ts
// This is a NEW file — create it at this path.
//
// APPROACH: rather than adding a whole new Notification table (a bigger
// schema migration + write-path changes everywhere something notify-worthy
// happens), this derives notifications on-the-fly from data that already
// exists:
//   - Equipment borrowings past their expected_return date and not yet
//     returned → "urgent"
//   - Blotter cases whose hearing_date has passed but the case is still
//     FILED/ONGOING → "urgent" (needs rescheduling/resolution)
//   - Blotter cases with a hearing coming up in the next 3 days → "warning"
//
// This is intentionally scoped to what's cheap and genuinely useful to
// surface today. It does NOT persist read/dismissed state (there's
// nowhere to store that without a table) — every notification here is
// recomputed fresh from current data each time this endpoint is called.
// If you want notifications a user can mark as read/dismiss permanently,
// that needs an actual Notification model + migration; this is the
// lighter-weight version that gets you real, meaningful alerts without one.
//
// Each category is only included if the logged-in user's role actually
// has read access to that resource (e.g. a BHW who can't read blotter
// cases won't see blotter-hearing notifications).

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { hasPermission } from "@/lib/permission";

type Severity = "urgent" | "warning" | "info";

interface NotificationItem {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  link: string;
  date: string; // ISO date driving both display and sort order
}

const SEVERITY_ORDER: Record<Severity, number> = { urgent: 0, warning: 1, info: 2 };

export async function GET() {
  const auth = await requirePermission("dashboard:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const role = (auth.session.user as any)?.role as string | undefined;
  const now = new Date();
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  const notifications: NotificationItem[] = [];

  // ── Equipment: overdue returns ──
  if (role && hasPermission(role, "equipment:read")) {
    const overdueEquipment = await prisma.equipmentBorrowing.findMany({
      where: { actual_return: null, expected_return: { lt: now } },
      include: { equipment: true },
      orderBy: { expected_return: "asc" },
      take: 10,
    });

    for (const b of overdueEquipment) {
      const daysOverdue = Math.max(1, Math.floor((now.getTime() - b.expected_return.getTime()) / 86400000));
      notifications.push({
        id: `equipment-${b.id}`,
        severity: "urgent",
        title: "Equipment overdue",
        message: `"${b.equipment.name}" borrowed by ${b.borrower_name} is ${daysOverdue} day${daysOverdue === 1 ? "" : "s"} overdue for return.`,
        link: "/equipment",
        date: b.expected_return.toISOString(),
      });
    }
  }

  // ── Blotter: hearing dates ──
  if (role && hasPermission(role, "blotter:read")) {
    const [overdueHearings, upcomingHearings] = await Promise.all([
      prisma.blotterCase.findMany({
        where: { status: { in: ["FILED", "ONGOING"] }, hearing_date: { lt: now } },
        orderBy: { hearing_date: "asc" },
        take: 10,
      }),
      prisma.blotterCase.findMany({
        where: { status: { in: ["FILED", "ONGOING"] }, hearing_date: { gte: now, lte: in3Days } },
        orderBy: { hearing_date: "asc" },
        take: 10,
      }),
    ]);

    for (const c of overdueHearings) {
      notifications.push({
        id: `hearing-overdue-${c.id}`,
        severity: "urgent",
        title: "Hearing overdue",
        message: `${c.case_number}: the scheduled hearing date has passed and the case is still ${c.status.toLowerCase()}.`,
        link: `/blotter/${c.id}`,
        date: c.hearing_date!.toISOString(),
      });
    }
    for (const c of upcomingHearings) {
      notifications.push({
        id: `hearing-upcoming-${c.id}`,
        severity: "warning",
        title: "Upcoming hearing",
        message: `${c.case_number} has a hearing scheduled on ${c.hearing_date!.toLocaleDateString("en-US", { month: "short", day: "numeric" })}.`,
        link: `/blotter/${c.id}`,
        date: c.hearing_date!.toISOString(),
      });
    }
  }

  notifications.sort((a, b) => {
    const sevDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (sevDiff !== 0) return sevDiff;
    return new Date(a.date).getTime() - new Date(b.date).getTime();
  });

  return NextResponse.json({ notifications, count: notifications.length });
}