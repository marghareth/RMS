// FILE: src/app/api/backup/route.ts
//
// GET  — backup history (ADMIN only: backup:write).
// POST — run a backup now. Where it goes (Supabase Storage on Vercel, or
//        pg_dump to local disk on a self-hosted server) is decided in
//        src/lib/backup.ts.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { runDatabaseBackup, BackupError } from "@/lib/backup";

// Node runtime (needs node:zlib / child_process), and room for a large
// snapshot: Vercel's default function limit can be as short as 10 s.
export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("backup:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const backups = await prisma.backup.findMany({
    include: { trigger: { select: { id: true, username: true } } },
    orderBy: { backup_date: "desc" },
  });

  return NextResponse.json(backups);
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("backup:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let result;
  try {
    result = await runDatabaseBackup();
  } catch (err) {
    if (err instanceof BackupError) throw new ApiError(500, "BACKUP_FAILED", err.message);
    throw err;
  }

  const userId = parseInt(auth.session.user.id);
  const sizeKb = (result.sizeBytes / 1024).toFixed(1);
  const rows = result.rowCount !== undefined ? `, ${result.rowCount} rows` : "";

  // Backup row and its audit entry commit together.
  const backup = await prisma.$transaction(async (tx) => {
    const row = await tx.backup.create({
      data: { triggered_by: userId, file_reference: result.fileReference },
    });
    await logAudit(
      {
        user_id: userId,
        action: "BACKUP",
        table_affected: "System",
        record_id: row.id,
        details: `Manual backup created (${result.destination}): ${result.fileReference} (${sizeKb} KB${rows})`,
      },
      tx
    );
    return row;
  });

  return NextResponse.json(
    { ...backup, sizeBytes: result.sizeBytes, destination: result.destination, rowCount: result.rowCount },
    { status: 201 }
  );
});