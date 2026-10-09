// FILE: src/app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("settings:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const settings = await prisma.systemSetting.findMany();
  const result = Object.fromEntries(settings.map((s: { key: string; value: string }) => [s.key, s.value]));
  return NextResponse.json(result);
});

// Body is a free-form map of setting key -> value, e.g. { "site_name": "..." }
const settingsPatchSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("settings:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = settingsPatchSchema.parse(await req.json());

  // Settings changes (barangay name, officials shown on certificates, …)
  // used to leave no trace; record what changed, together with the write.
  const updates = await prisma.$transaction(async (tx) => {
    const rows = await Promise.all(
      Object.entries(body).map(([key, value]) =>
        tx.systemSetting.upsert({
          where: { key },
          update: { value: String(value) },
          create: { key, value: String(value) },
        })
      )
    );
    await logAudit(
      {
        user_id: parseInt(auth.session.user.id),
        action: "UPDATE",
        table_affected: "SystemSetting",
        details: `Updated settings: ${Object.keys(body).join(", ")}`.slice(0, 1000),
      },
      tx
    );
    return rows;
  });

  return NextResponse.json(updates);
});