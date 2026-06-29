import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest) {
  const auth = await requirePermission("backup:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const backups = await prisma.backup.findMany({
    include: { trigger: { select: { id: true, username: true } } },
    orderBy: { backup_date: "desc" },
  });

  return NextResponse.json(backups);
}

export async function POST(req: NextRequest) {
  const auth = await requirePermission("backup:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const backup = await prisma.backup.create({
    data: {
      triggered_by: parseInt(auth.session.user.id),
      file_reference: `backup-${Date.now()}.sql`,
    },
  });

  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "BACKUP",
    table_affected: "System",
    record_id: backup.id,
    details: `Manual backup triggered`,
  });

  return NextResponse.json(backup, { status: 201 });
}