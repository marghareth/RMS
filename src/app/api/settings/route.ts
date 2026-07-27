// FILE: src/app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async () => {
  const auth = await requirePermission("settings:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const settings = await prisma.systemSetting.findMany();
  const result = Object.fromEntries(settings.map((s: { key: string; value: string }) => [s.key, s.value]));
  return NextResponse.json(result);
});

// Body is a free-form map of setting key -> value, e.g. { "site_name": "..." }
const settingsPatchSchema = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

export const PATCH = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("settings:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = settingsPatchSchema.parse(await req.json());

  const updates = await Promise.all(
    Object.entries(body).map(([key, value]) =>
      prisma.systemSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );

  return NextResponse.json(updates);
});