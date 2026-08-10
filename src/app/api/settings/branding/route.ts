// FILE: src/app/api/settings/branding/route.ts
//
// A narrow, read-only view of General Settings for display purposes only
// (currently just the sidebar brand). Unlike GET /api/settings, this does
// NOT require the "settings:read" permission — only ADMIN and CAPTAIN hold
// that, so gating the barangay name behind it meant every other role
// (Secretary, Kagawad, BHW, Encoder) silently fell back to the generic
// "Barangay RMS" label instead of seeing the actual barangay this instance
// is deployed for. The barangay name isn't sensitive, so any authenticated
// user can read it here; the full settings resource (contact info,
// signatory overrides, etc.) still requires "settings:read" as before.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const setting = await prisma.systemSetting.findUnique({ where: { key: "barangay_name" } });
  return NextResponse.json({ barangay_name: setting?.value ?? "" });
});