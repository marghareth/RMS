// FILE: src/app/api/residents/import/template/route.ts
//
// GET — the resident import template as a formatted Excel file: a titled
// Residents sheet with navy headings, required columns marked *, dropdowns
// for Sex, Civil Status and Purok (this barangay's real puroks), Mobile No.
// kept as text, and an Instructions sheet. Built in
// src/lib/resident-spreadsheet.ts.
//
// ?format=csv still returns the plain one-line CSV header, for anyone who
// prefers it.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { buildImportTemplateCsv } from "@/lib/residentImport";
import { buildImportTemplate } from "@/lib/resident-spreadsheet";
import { getBarangayInfo } from "@/lib/barangay-info";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  if (new URL(req.url).searchParams.get("format") === "csv") {
    return new NextResponse(buildImportTemplateCsv(), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="resident-import-template.csv"`,
      },
    });
  }

  const [puroks, barangay] = await Promise.all([
    prisma.purok.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
    getBarangayInfo(),
  ]);

  const file = await buildImportTemplate({
    barangay: barangay.name,
    puroks: puroks.map((p: { name: string }) => p.name),
  });

  return new NextResponse(new Uint8Array(file), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="resident-import-template.xlsx"`,
    },
  });
});