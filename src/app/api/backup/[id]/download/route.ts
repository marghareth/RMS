// FILE: src/app/api/backup/[id]/download/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { resolveBackupPath, BackupError } from "@/lib/backup";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("backup:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);

  const backup = await prisma.backup.findUnique({ where: { id } });
  if (!backup || !backup.file_reference) throw new ApiError(404, "NOT_FOUND", "Backup not found.");

  let absolutePath: string;
  try {
    absolutePath = resolveBackupPath(backup.file_reference);
  } catch (err) {
    if (err instanceof BackupError) throw new ApiError(400, "INVALID_PATH", err.message);
    throw err;
  }

  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(absolutePath);
  } catch {
    throw new ApiError(
      404,
      "FILE_MISSING",
      "This backup's file is no longer on disk (it may have been moved, deleted, or this is a different server than the one that created it)."
    );
  }

  return new NextResponse(fileBuffer as unknown as BodyInit, {
    headers: {
      "Content-Type": "application/sql",
      "Content-Disposition": `attachment; filename="${backup.file_reference}"`,
    },
  });
});