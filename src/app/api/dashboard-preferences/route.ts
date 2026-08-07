// FILE: src/app/api/dashboard-preferences/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { dashboardPreferenceUpdateSchema } from "@/lib/validations";
import { getRoleDefaults, ALL_WIDGET_KEYS, type WidgetKey } from "@/lib/dashboard-defaults";

// GET → the current user's effective preferences: role defaults with any
// of the user's own saved overrides layered on top. Every widget_key is
// always present in the response so the frontend never has to guess.
export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("dashboard-preferences:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);
  const role = (auth.session.user as any).role as string;

  const saved = await prisma.dashboardPreference.findMany({ where: { user_id: userId } });
  const defaults = getRoleDefaults(role);

  const preferences = { ...defaults };
  for (const row of saved) {
    if (ALL_WIDGET_KEYS.includes(row.widget_key as WidgetKey)) {
      preferences[row.widget_key as WidgetKey] = row.is_enabled;
    }
  }

  return NextResponse.json({ preferences, defaults, hasCustomizations: saved.length > 0 });
});

// PATCH → upsert the given widget preferences for the current user.
export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("dashboard-preferences:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);
  const body = dashboardPreferenceUpdateSchema.parse(await req.json());

  await Promise.all(
    body.preferences.map((p) =>
      prisma.dashboardPreference.upsert({
        where: { user_id_widget_key: { user_id: userId, widget_key: p.widget_key } },
        update: { is_enabled: p.is_enabled },
        create: { user_id: userId, widget_key: p.widget_key, is_enabled: p.is_enabled },
      })
    )
  );

  await logAudit({
    user_id: userId,
    action: "UPDATE",
    table_affected: "DashboardPreference",
    record_id: userId,
    details: `Updated dashboard widget preferences (${body.preferences.length} widget(s))`,
  });

  const role = (auth.session.user as any).role as string;
  const saved = await prisma.dashboardPreference.findMany({ where: { user_id: userId } });
  const defaults = getRoleDefaults(role);
  const preferences = { ...defaults };
  for (const row of saved) {
    if (ALL_WIDGET_KEYS.includes(row.widget_key as WidgetKey)) {
      preferences[row.widget_key as WidgetKey] = row.is_enabled;
    }
  }

  return NextResponse.json({ preferences, defaults, hasCustomizations: saved.length > 0 });
});

// DELETE → "Reset to Role Defaults": wipes the user's saved overrides so
// the role defaults apply again on next GET.
export const DELETE = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("dashboard-preferences:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const userId = parseInt(auth.session.user.id);

  await prisma.dashboardPreference.deleteMany({ where: { user_id: userId } });

  await logAudit({
    user_id: userId,
    action: "DELETE",
    table_affected: "DashboardPreference",
    record_id: userId,
    details: "Reset dashboard widget preferences to role defaults",
  });

  const role = (auth.session.user as any).role as string;
  const preferences = getRoleDefaults(role);

  return NextResponse.json({ preferences, defaults: preferences, hasCustomizations: false });
});