// FILE: src/app/api/reports/processing/export/route.ts
//
// GET ?year=2026&month=11 — the Processing Time report as an Excel file:
//   Summary   averages per document, with a "Manual process (min)" column
//             to type the manual timings into and a Difference column that
//             works itself out
//   Requests  every request in the period with each step's time stamp and
//             duration (minutes), filterable
// See src/lib/reports/processing.ts.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit";
import { getBarangayInfo } from "@/lib/barangay-info";
import { periodLabel, periodRange, readPeriod } from "@/lib/reports/definitions";
import { buildTimingWorkbook, loadTimingRows } from "@/lib/reports/processing";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("reports:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const period = readPeriod(new URL(req.url).searchParams);
  const [rows, info] = await Promise.all([loadTimingRows(prisma, periodRange(period)), getBarangayInfo()]);
  const file = await buildTimingWorkbook({
    barangay: info.name,
    periodLabel: periodLabel(period),
    exportedBy: auth.session.user.username,
    rows,
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "EXPORT",
    table_affected: "Report",
    details: `Exported the Processing Time report (${periodLabel(period)}, ${rows.length} requests) to Excel`,
  });

  const stamp = `${period.year}${period.month ? `-${String(period.month).padStart(2, "0")}` : ""}`;
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="processing-time-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});