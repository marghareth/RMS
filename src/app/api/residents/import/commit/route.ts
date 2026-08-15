// FILE: src/app/api/residents/import/commit/route.ts
//
// POST { rows: Record<string,string>[] } — the raw (unvalidated) row data
// the client got back from /preview, minus whichever rows staff deselected.
// Deliberately re-parses and re-validates every row here rather than
// trusting anything from the preview response or a client-computed "this
// row is valid" flag — that response is just JSON, and a modified request
// could otherwise smuggle through a row that never actually passed
// validation.
//
// Inserts run sequentially, not via Promise.all — see prisma/migrations/
// seed.ts, which hit exactly this project's Supabase pooled-connection
// limit (15) by firing ~20 concurrent creates at once. A bulk import can
// be much larger than that, so sequential is the only safe default here.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";
import { residentImportCommitSchema } from "@/lib/validations";
import { validateImportRow, ImportLookups } from "@/lib/residentImport";

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { rows: rawRows } = residentImportCommitSchema.parse(await req.json());
  const userId = parseInt(auth.session.user.id);

  const [puroks, households] = await Promise.all([
    prisma.purok.findMany({ select: { id: true, name: true } }),
    prisma.household.findMany({ select: { id: true, household_no: true, purok_id: true } }),
  ]);
  const lookups: ImportLookups = {
    puroksByName: new Map(puroks.map((p: { id: number; name: string }) => [p.name.toLowerCase(), p.id])),
    householdsByNo: new Map(
      households.map((h: { id: number; household_no: string; purok_id: number }) => [
        h.household_no.toLowerCase(),
        { id: h.id, purok_id: h.purok_id },
      ])
    ),
  };

  const created: number[] = [];
  const skipped: { rowNumber: number; reason: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const validated = validateImportRow(i + 1, rawRows[i], lookups);
    if (!validated.data || validated.errors.length > 0) {
      skipped.push({ rowNumber: validated.rowNumber, reason: validated.errors.join("; ") || "Invalid row" });
      continue;
    }

    // Re-check duplicates at commit time too — the DB may have changed
    // since /preview ran (e.g. two staff importing overlapping files).
    const existing = await prisma.resident.findFirst({
      where: { fname: validated.data.fname, lname: validated.data.lname, birthdate: validated.data.birthdate },
      select: { id: true },
    });
    if (existing) {
      skipped.push({ rowNumber: validated.rowNumber, reason: `Matches existing resident (id ${existing.id})` });
      continue;
    }

    const resident = await prisma.resident.create({
      data: {
        fname: validated.data.fname,
        lname: validated.data.lname,
        mname: validated.data.mname,
        name_extension: validated.data.name_extension,
        birthdate: validated.data.birthdate,
        sex: validated.data.sex,
        civil_status: validated.data.civil_status,
        purok_id: validated.data.purok_id,
        household_id: validated.data.household_id,
        place_of_birth: validated.data.place_of_birth,
        religion: validated.data.religion,
        employment_status: validated.data.employment_status,
        educational_attainment: validated.data.educational_attainment,
        occupation: validated.data.occupation,
        income_bracket: validated.data.income_bracket,
        mobile: validated.data.mobile,
        email: validated.data.email,
      },
    });
    created.push(resident.id);
  }

  if (created.length > 0) {
    await logAudit({
      user_id: userId,
      action: "CREATE",
      table_affected: "Resident",
      record_id: created[0],
      details: `Bulk import: created ${created.length} resident(s) (ids ${created.join(", ")})${skipped.length ? `, skipped ${skipped.length}` : ""}`,
    });
  }

  return NextResponse.json({ created: created.length, skipped });
});