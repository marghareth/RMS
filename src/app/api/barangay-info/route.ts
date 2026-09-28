// FILE: src/app/api/barangay-info/route.ts
//
// Read-only "who is this barangay / who signs" view for the certificate
// preview, template editor and new-certificate screens. Any authenticated
// user can read it — these are the exact values printed on every issued
// certificate, so they aren't sensitive, and gating them behind
// "settings:read" (ADMIN/CAPTAIN only) would leave the Secretary and
// Encoder — who actually issue certificates — with a blank preview.
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { getBarangayContext } from "@/lib/barangay-info";

export const GET = withErrorHandling(async () => {
  const auth = await requireAuth();
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json(await getBarangayContext());
});