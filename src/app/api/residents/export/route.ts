// FILE: src/app/api/residents/export/route.ts
//
// GET — downloads the residents the Residents list is showing (same search
// and filters, src/lib/resident-filters.ts) as a formatted Excel file.
//
// The file uses the import template's layout (src/lib/resident-spreadsheet.ts),
// so it can be corrected in Excel and imported again.
//
// ?format=pdf (Nov 2026) returns a printable PDF with only the important
// columns (name, sex, age, birthdate, civil status, purok, household no.)
// instead of the Excel file. Same filters, permission and audit entry.
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
import { barangayHeading, listPdfResponse, readExportFormat } from "@/lib/pdf/listExport";

// @react-pdf/renderer needs Node (not the Edge runtime) for the PDF choice.
export const runtime = "nodejs";

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

  const params = new URL(req.url).searchParams;
  const filters = readResidentFilters(params);
  const format = readExportFormat(params);
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

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "EXPORT",
    table_affected: "Resident",
    details: `Exported ${residents.length} residents to ${format === "pdf" ? "PDF" : "Excel"} (${which})`,
  });

  const stamp = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // YYYY-MM-DD

  if (format === "pdf") {
    const age = (b: Date) => {
      const born = new Date(b);
      let a = now.getFullYear() - born.getUTCFullYear();
      const m = now.getMonth() - born.getUTCMonth();
      if (m < 0 || (m === 0 && now.getDate() < born.getUTCDate())) a--;
      return a;
    };
    const male = residents.filter((r) => r.sex === "MALE").length;
    const seniors = residents.filter((r) => age(r.birthdate) >= 60).length;
    return listPdfResponse(
      {
        barangayName: barangayHeading(barangay.name),
        location: [barangay.city, barangay.province].filter(Boolean).join(", "),
        title: "List of residents",
        summary: [
          `${residents.length} resident${residents.length === 1 ? "" : "s"}`,
          `${male} male`,
          `${residents.length - male} female`,
          `${seniors} aged 60 and over`,
        ],
        note: `${which.charAt(0).toUpperCase()}${which.slice(1)} · exported ${manilaDate(now, true)} by ${auth.session.user.username}`,
        columns: [
          { header: "Name", width: 30 },
          { header: "Sex", width: 8 },
          { header: "Age", width: 6, align: "right" },
          { header: "Birthdate", width: 13 },
          { header: "Civil status", width: 12 },
          { header: "Purok", width: 11 },
          { header: "Household no.", width: 17 },
        ],
        rows: residents.map((r) => [
          `${r.lname}, ${r.fname}${r.name_extension ? " " + r.name_extension : ""}${r.mname ? " " + r.mname[0] + "." : ""}`,
          r.sex === "MALE" ? "Male" : r.sex === "FEMALE" ? "Female" : r.sex,
          String(age(r.birthdate)),
          r.birthdate.toISOString().slice(0, 10),
          ({ SINGLE: "Single", MARRIED: "Married", WIDOWED: "Widowed", SEPARATED: "Separated", LIVE_IN: "Live-in" } as Record<string, string>)[r.civil_status] ?? r.civil_status,
          r.purok?.name ?? "",
          r.household?.household_no ?? "",
        ]),
        emptyText: "No residents match these filters.",
      },
      `residents-${stamp}.pdf`
    );
  }

  const file = await buildResidentExport({ barangay: barangay.name, residents, note });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="residents-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});