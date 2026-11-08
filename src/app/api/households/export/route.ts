// FILE: src/app/api/households/export/route.ts
//
// GET — downloads the households the Households list is showing as a
// formatted Excel file (Nov 2026), replacing the client-built BIMS CSV.
// Same look and rules as the Residents export (/api/residents/export):
//   • ?purok_id= and ?search= match the list's purok filter and search box
//     (search looks at household no., address and the head's name)
//   • household and member details are personal data, so this needs
//     residents:export (Admin and Secretary)
//   • every export is written to the audit log
//   • ?format=pdf returns a printable PDF with only the important columns
//     (household no., head, purok, address, members) instead of the Excel
// File layout: src/lib/household-spreadsheet.ts (Excel), ListExportPDF (PDF).

import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { buildHouseholdExport } from "@/lib/household-spreadsheet";
import { getBarangayInfo } from "@/lib/barangay-info";
import { barangayHeading, listPdfResponse, readExportFormat } from "@/lib/pdf/listExport";

// @react-pdf/renderer needs Node (not the Edge runtime) for the PDF choice.
export const runtime = "nodejs";

/** More than any barangay has; stops one request from building an enormous file. */
const MAX_EXPORT = 10000;

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
  const purokParam = params.get("purok_id");
  const purok_id = purokParam ? parseInt(purokParam, 10) : null;
  if (purokParam && (!Number.isInteger(purok_id) || (purok_id as number) <= 0)) {
    throw new ApiError(400, "VALIDATION_ERROR", "That purok isn't valid. Pick one from the list.");
  }
  const search = (params.get("search") ?? "").trim().slice(0, 100);
  const format = readExportFormat(params);

  const and: Prisma.HouseholdWhereInput[] = [];
  if (purok_id) and.push({ purok_id });
  if (search) {
    // Each word must appear in the household no., the address, or the head's name.
    for (const word of search.split(/\s+/).filter(Boolean)) {
      const contains = { contains: word, mode: "insensitive" as const };
      and.push({
        OR: [
          { household_no: contains },
          { address: contains },
          { household_head: { is: { OR: [{ fname: contains }, { lname: contains }, { mname: contains }] } } },
        ],
      });
    }
  }
  const where: Prisma.HouseholdWhereInput = and.length ? { AND: and } : {};

  const total = await prisma.household.count({ where });
  if (total > MAX_EXPORT) {
    throw new ApiError(400, "TOO_MANY", `That's ${total} households. Narrow the filters to ${MAX_EXPORT} or fewer.`);
  }

  const person = { id: true, fname: true, lname: true, mname: true, name_extension: true, birthdate: true, sex: true, civil_status: true };
  const [households, barangay, purok] = await Promise.all([
    prisma.household.findMany({
      where,
      orderBy: [{ purok: { name: "asc" } }, { household_no: "asc" }],
      include: {
        purok: { select: { name: true } },
        household_head: { select: person },
        // Archived residents are left out, as in the Residents export.
        members: { where: { is_archived: false }, select: person },
      },
    }),
    getBarangayInfo(),
    purok_id ? prisma.purok.findUnique({ where: { id: purok_id }, select: { name: true } }) : null,
  ]);

  const now = new Date();
  const parts = [purok?.name, search && `search "${search}"`].filter(Boolean);
  const which = parts.length ? parts.join(", ") : "all households";
  const memberCount = households.reduce((n, h) => n + h.members.length, 0);
  const note =
    `${households.length} household${households.length === 1 ? "" : "s"}, ${memberCount} member${memberCount === 1 ? "" : "s"} ` +
    `(${which}) · exported ${manilaDate(now, true)} by ${auth.session.user.username}. Contains personal information; keep it secure.`;

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "EXPORT",
    table_affected: "Household",
    details: `Exported ${households.length} households (${memberCount} members) to ${format === "pdf" ? "PDF" : "Excel"} (${which})`,
  });

  const stamp = now.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }); // YYYY-MM-DD

  if (format === "pdf") {
    const name = (m: { fname: string; lname: string; mname: string | null; name_extension: string | null }) =>
      `${m.lname}, ${m.fname}${m.name_extension ? " " + m.name_extension : ""}${m.mname ? " " + m.mname[0] + "." : ""}`;
    const noHead = households.filter((h) => !h.household_head).length;
    const avg = households.length ? (memberCount / households.length).toFixed(1) : "0";
    return listPdfResponse(
      {
        barangayName: barangayHeading(barangay.name),
        location: [barangay.city, barangay.province].filter(Boolean).join(", "),
        title: "List of households",
        summary: [
          `${households.length} household${households.length === 1 ? "" : "s"}`,
          `${memberCount} member${memberCount === 1 ? "" : "s"}`,
          `avg. ${avg} per household`,
          noHead > 0 ? `${noHead} without a head` : "",
        ],
        note: `${which.charAt(0).toUpperCase()}${which.slice(1)} · exported ${manilaDate(now, true)} by ${auth.session.user.username}`,
        columns: [
          { header: "Household no.", width: 17 },
          { header: "Household head", width: 24 },
          { header: "Purok", width: 10 },
          { header: "Address", width: 30 },
          { header: "Members", width: 9, align: "right" },
        ],
        rows: households.map((h) => [
          h.household_no,
          h.household_head ? name(h.household_head) : "No head yet",
          h.purok?.name ?? "",
          h.address,
          String(h.members.length),
        ]),
        emptyText: "No households match these filters.",
      },
      `households-${stamp}.pdf`
    );
  }

  const file = await buildHouseholdExport({ barangay: barangay.name, households, note, now });
  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="households-${stamp}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
});