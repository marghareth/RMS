// FILE: src/app/api/residents/export/route.ts
//
// GET — downloads the residents the Residents list is showing (same search
// and filters, src/lib/resident-filters.ts) as a formatted Excel file.
//
// The file uses the import template's layout (src/lib/resident-spreadsheet.ts),
// so it can be corrected in Excel and imported again.
//
// Resident records are personal data, so exporting needs its own permission,
// residents:export, which only Admin and Secretary have (their "*" covers
// it). Every export is written to the audit log with who, how many and
// which filters.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { readResidentFilters, residentWhere, type ResidentFilters } from "@/lib/resident-filters";
import { buildResidentExport } from "@/lib/resident-spreadsheet";
import { getBarangayInfo } from "@/lib/barangay-info";

/** More than any barangay has; stops one request from building an enormous file. */
const MAX_EXPORT = 20000;

function describeFilters(f: ResidentFilters, purokName: string | null): string {
  const parts: string[] = [];
  if (f.search) parts.push(`name contains "${f.search}"`);
  if (f.sex) parts.push(f.sex === "MALE" ? "male" : "female");
  if (f.civil_status) parts.push(f.civil_status.toLowerCase().replace("_", "-"));
  if (purokName) parts.push(purokName);
  if (f.unassigned) parts.push("no household");
  if (f.is_archived) parts.push("archived");
  return parts.length ? parts.join(", ") : "all residents";
}

function manilaDate(d: Date, withTime = false) {
  return d.toLocaleString("en-PH", {
    timeZone: "Asia/Manila",
    month: "long",
    day: "numeric",
    year: "numeric",
    ...(withTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
}

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:export", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const filters = readResidentFilters(new URL(req.url).searchParams);
  const where = residentWhere(filters);

  const total = await prisma.resident.count({ where });
  if (total > MAX_EXPORT) {
    throw new ApiError(400, "TOO_MANY", `That's ${total} residents. Narrow the filters to ${MAX_EXPORT} or fewer.`);
  }

  const [residents, barangay, purok] = await Promise.all([
    prisma.resident.findMany({
      where,
      orderBy: [{ lname: "asc" }, { fname: "asc" }],
      include: { purok: { select: { name: true } }, household: { select: { household_no: true } } },
    }),
    getBarangayInfo(),
    filters.purok_id ? prisma.purok.findUnique({ where: { id: filters.purok_id }, select: { name: true } }) : null,
  ]);

  const now = new Date();
  const which = describeFilters(filters, purok?.name ?? null);
  const note = `${residents.length} resident${residents.length === 1 ? "" : "s"} (${which}) · exported ${manilaDate(now, true)} by ${auth.session.user.username}. Contains personal information; keep it secure.`;

  const file = await buildResidentExport({ barangay: barangay.name, residents, note });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "EXPORT",
    table_affected: "Resident",
    details: `Exported ${residents.length} residents to Excel (${which})`,
  });

  const stamp = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // YYYY-MM-DD
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="residents-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});