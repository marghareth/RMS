// FILE: src/app/api/reports/[type]/route.ts
//
// GET ?year=2026&month=11 — one of the reports defined in
// src/lib/reports/definitions.ts (households, health, deceased, officials,
// visitors, meetings, barangay-ids, finance, requests) as JSON, for the
// on-screen report page. GET /api/pdf/report/[type] renders the same data
// as a PDF.
//
// The original six reports (population, certificates, blotter, financial,
// inventory, registries) are still served by GET /api/reports?type=...

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { buildReport, isDefinedReport, readPeriod } from "@/lib/reports/definitions";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("reports:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { type } = await context!.params;
  if (!isDefinedReport(type)) return NextResponse.json({ error: "Unknown report" }, { status: 404 });

  const data = await buildReport(prisma, type, readPeriod(new URL(req.url).searchParams));
  return NextResponse.json(data);
});