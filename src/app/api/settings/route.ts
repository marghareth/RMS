// FILE: src/app/api/settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";

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

  // Certificate logos (General Settings) must be small PNG/JPEG data URLs.
  for (const key of ["logo_barangay", "logo_city"]) {
    const v = body[key];
    if (v === undefined || v === "") continue;
    if (typeof v !== "string" || !/^data:image\/(png|jpe?g);base64,[A-Za-z0-9+/=]+$/.test(v)) {
      throw new ApiError(400, "BAD_LOGO", "The logo must be a PNG or JPG image.");
    }
    if (v.length > 1_000_000) throw new ApiError(400, "BAD_LOGO", "The logo image is too large. Use one under 700 KB.");
  }

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