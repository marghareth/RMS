// FILE: src/app/api/residents/import/preview/route.ts
//
// POST multipart/form-data { file } — parses and validates every row of an
// uploaded resident spreadsheet, but writes nothing to the database. The
// client shows this preview, lets staff deselect bad/duplicate rows, then
// POSTs the surviving rows to /commit. Re-validated from scratch there too
// — this route's output is just JSON a browser could tamper with.

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { parseImportFile, validateImportRow, ImportParseError, ImportLookups } from "@/lib/residentImport";
import { DuplicateIndex, DUPLICATE_SELECT, toMatchInfo, type ResidentIdentity } from "@/lib/duplicate-detection";

const MAX_ROWS = 500;

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const formData = await req.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) throw new ApiError(400, "NO_FILE", "No file uploaded.");
  if (!/\.(csv|xlsx?)$/i.test(file.name)) {
    throw new ApiError(400, "BAD_FILE_TYPE", "Only .csv and .xlsx files are supported.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  let rawRows: Record<string, string>[];
  try {
    rawRows = parseImportFile(buffer, file.name);
  } catch (err) {
    if (err instanceof ImportParseError) throw new ApiError(400, "PARSE_ERROR", err.message);
    throw err;
  }

  if (rawRows.length === 0) throw new ApiError(400, "EMPTY_FILE", "No data rows found in the file.");
  if (rawRows.length > MAX_ROWS) {
    throw new ApiError(400, "TOO_MANY_ROWS", `This file has ${rawRows.length} rows — the limit is ${MAX_ROWS} per import.`);
  }

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

  const validated = rawRows.map((raw, i) => validateImportRow(i + 1, raw, lookups));

  // ── Duplicate detection ──
  // One shared rule (src/lib/duplicate-detection.ts), identical to the
  // manual "Add Resident" form:
  //   EXACT    same person after normalizing case/accents/punctuation/spacing
  //            -> isDuplicate (hard block, row cannot be imported)
  //   POSSIBLE swapped names, one-letter typo, likely birthdate typo
  //            -> possibleDuplicates (warning; importable once confirmed)
  // Each row is compared with existing residents AND with the rows above it
  // in this file, since a spreadsheet can itself contain accidental repeats.
  //
  // All residents are loaded once (slim columns) rather than one query per
  // row: with up to MAX_ROWS rows that's one round-trip instead of hundreds,
  // and — unlike the old per-row SQL equality — it is not case/accent
  // sensitive, so near-matches aren't missed.
  type Known = ResidentIdentity & { id?: number; rowNumber?: number };
  const hasRows = validated.some((r) => r.data);
  const existing: Known[] = hasRows
    ? await prisma.resident.findMany({ select: DUPLICATE_SELECT })
    : [];
  const index = new DuplicateIndex<Known>(existing);

  for (const row of validated) {
    if (!row.data) continue;

    const hits = index.find(row.data);
    const exact = hits.filter((h) => h.level === "EXACT");
    if (exact.length > 0) {
      // Prefer pointing at the stored resident over an earlier row.
      const target = exact.find((h) => h.record.rowNumber == null) ?? exact[0];
      row.isDuplicate = true;
      row.errors.push(
        target.record.rowNumber != null
          ? "Duplicate of an earlier row in this file"
          : `Matches an existing resident (id ${target.record.id})`
      );
      continue; // already represented in the index by the record it matched
    }

    row.possibleDuplicates = hits.map(toMatchInfo);
    index.add({ ...row.data, rowNumber: row.rowNumber });
  }

  const validCount = validated.filter((r) => r.data && r.errors.length === 0).length;
  const errorCount = validated.filter((r) => r.errors.length > 0).length;
  const duplicateCount = validated.filter((r) => r.isDuplicate).length;
  const possibleCount = validated.filter((r) => r.data && r.possibleDuplicates.length > 0).length;

  return NextResponse.json({
    rows: validated,
    summary: {
      total: validated.length,
      valid: validCount,
      errors: errorCount,
      duplicates: duplicateCount,          // exact — blocked
      possibleDuplicates: possibleCount,   // need the user's confirmation
    },
  });
});