// FILE: src/app/api/dashboard-preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { dashboardPreferenceUpdateSchema } from "@/lib/validations";
import { ALL_WIDGET_KEYS, isWidgetEnabledByDefault, WidgetKey } from "@/lib/dashboard-widgets";

// Only deviations from the role default are stored (see
// src/lib/dashboard-widgets.ts) — so GET always returns the full,
// resolved 11-widget list regardless of how many rows actually exist for
// this user, merging any stored override on top of their role's default.
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("dashboard-preferences:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);
  const role = auth.session.user.role;

  const stored = await prisma.dashboardPreference.findMany({ where: { user_id: userId } });
  const overrides = new Map(stored.map((p) => [p.widget_key, p.is_enabled]));

  const preferences = ALL_WIDGET_KEYS.map((key) => ({
    widget_key: key,
    is_enabled: overrides.has(key) ? overrides.get(key)! : isWidgetEnabledByDefault(role, key as WidgetKey),
    is_default: !overrides.has(key),
  }));

  return NextResponse.json({ preferences });
});

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("dashboard-preferences:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = dashboardPreferenceUpdateSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);
  const role = auth.session.user.role;

  // Upsert only rows that actually deviate from the role default; if a
  // toggle is switched back to match the default, delete the row instead
  // of storing a redundant override — keeps "Reset to Role Defaults"
  // meaningful and the table from accumulating no-op rows.
  await prisma.$transaction(
    body.preferences.map((p) => {
      const matchesDefault = p.is_enabled === isWidgetEnabledByDefault(role, p.widget_key as WidgetKey);
      if (matchesDefault) {
        return prisma.dashboardPreference.deleteMany({
          where: { user_id: userId, widget_key: p.widget_key },
        });
      }
      return prisma.dashboardPreference.upsert({
        where: { user_id_widget_key: { user_id: userId, widget_key: p.widget_key } },
        update: { is_enabled: p.is_enabled },
        create: { user_id: userId, widget_key: p.widget_key, is_enabled: p.is_enabled },
      });
    })
  );

  await logAudit({
    user_id: userId,
    action: "UPDATE",
    table_affected: "DashboardPreference",
    details: `Updated dashboard widget preferences (${body.preferences.length} widget${body.preferences.length !== 1 ? "s" : ""})`,
  });

  const stored = await prisma.dashboardPreference.findMany({ where: { user_id: userId } });
  const overrides = new Map(stored.map((p) => [p.widget_key, p.is_enabled]));
  const preferences = ALL_WIDGET_KEYS.map((key) => ({
    widget_key: key,
    is_enabled: overrides.has(key) ? overrides.get(key)! : isWidgetEnabledByDefault(role, key as WidgetKey),
    is_default: !overrides.has(key),
  }));

  return NextResponse.json({ preferences });
});

// Reset to role defaults: simply clear every stored override for this
// user — GET/PATCH already fall back to isWidgetEnabledByDefault() for
// anything with no row, so deleting is the reset.
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("dashboard-preferences:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);
  const role = auth.session.user.role;

  await prisma.dashboardPreference.deleteMany({ where: { user_id: userId } });

  await logAudit({
    user_id: userId,
    action: "UPDATE",
    table_affected: "DashboardPreference",
    details: "Reset dashboard widget preferences to role defaults",
  });

  const preferences = ALL_WIDGET_KEYS.map((key) => ({
    widget_key: key,
    is_enabled: isWidgetEnabledByDefault(role, key as WidgetKey),
    is_default: true,
  }));

  return NextResponse.json({ preferences });
});