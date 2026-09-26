// FILE: src/app/api/settings/branding/route.ts
//
// A narrow, read-only view of General Settings for display purposes only
// (currently the sidebar brand + whether the onboarding tour's beginner
// prompt is switched on). Unlike GET /api/settings, this does NOT require
// the "settings:read" permission — only ADMIN and CAPTAIN hold that, so
// gating either value behind it meant every other role (Secretary,
// Kagawad, BHW, Encoder) silently fell back to defaults instead of seeing
// the barangay this instance is deployed for, or missed an admin turning
// the tour prompt off. Neither value is sensitive, so any authenticated
// user can read them here; the full settings resource (contact info,
// signatory overrides, etc.) still requires "settings:read" as before.
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireAuth } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";

export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const [brandingSetting, onboardingSetting] = await Promise.all([
    prisma.systemSetting.findUnique({ where: { key: "barangay_name" } }),
    prisma.systemSetting.findUnique({ where: { key: "onboarding_tour_enabled" } }),
  ]);

  return NextResponse.json({
    barangay_name: brandingSetting?.value ?? "",
    // Absent row = never configured — defaults to enabled (opt-out, not opt-in).
    onboarding_tour_enabled: onboardingSetting ? onboardingSetting.value !== "false" : true,
  });
});