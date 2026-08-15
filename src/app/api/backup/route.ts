// FILE: src/app/api/backup/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { runDatabaseBackup, BackupError } from "@/lib/backup";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("backup:write");
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

  const backup = await prisma.backup.create({
    data: {
      triggered_by: parseInt(auth.session.user.id),
      file_reference: result.relativePath,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "BACKUP",
    table_affected: "System",
    record_id: backup.id,
    details: `Manual backup created: ${result.relativePath} (${(result.sizeBytes / 1024).toFixed(1)} KB)`,
  });

  return NextResponse.json({ ...backup, sizeBytes: result.sizeBytes }, { status: 201 });
});