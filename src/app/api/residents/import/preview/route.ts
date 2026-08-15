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
  // Against existing residents (same fname+lname+birthdate — same rule the
  // regular "Add Resident" form uses), and against earlier rows in this
  // same file, since a spreadsheet can itself contain accidental repeats.
  //
  // Existing-resident matches are checked with one batched query rather
  // than one round-trip per row — with up to MAX_ROWS rows, N sequential
  // queries would be both slow and (per the lesson from this project's
  // seed script) risk exhausting a pooled connection limit if ever changed
  // to run concurrently instead.
  const rowsWithData = validated.filter((r) => r.data);
  const existingMatches = rowsWithData.length
    ? await prisma.resident.findMany({
        where: {
          OR: rowsWithData.map((r) => ({
            fname: r.data!.fname,
            lname: r.data!.lname,
            birthdate: r.data!.birthdate,
          })),
        },
        select: { id: true, fname: true, lname: true, birthdate: true },
      })
    : [];
  const existingKeyToId = new Map(
    existingMatches.map((m: { id: number; fname: string; lname: string; birthdate: Date }) => [
      `${m.fname.toLowerCase()}|${m.lname.toLowerCase()}|${m.birthdate.toISOString().slice(0, 10)}`,
      m.id,
    ])
  );

  const seenInFile = new Set<string>();
  for (const row of validated) {
    if (!row.data) continue;
    const key = `${row.data.fname.toLowerCase()}|${row.data.lname.toLowerCase()}|${row.data.birthdate.toISOString().slice(0, 10)}`;

    if (seenInFile.has(key)) {
      row.isDuplicate = true;
      row.errors.push("Duplicate of an earlier row in this file");
      continue;
    }
    seenInFile.add(key);

    const existingId = existingKeyToId.get(key);
    if (existingId) {
      row.isDuplicate = true;
      row.errors.push(`Matches an existing resident (id ${existingId})`);
    }
  }

  const validCount = validated.filter((r) => r.data && r.errors.length === 0).length;
  const errorCount = validated.filter((r) => r.errors.length > 0).length;

  return NextResponse.json({
    rows: validated,
    summary: { total: validated.length, valid: validCount, errors: errorCount },
  });
});