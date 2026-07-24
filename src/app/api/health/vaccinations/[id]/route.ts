// FILE PATH: src/app/api/health/vaccinations/[id]/route.ts
// This is a NEW file — it did not exist before. Create it at this path.
//
// WHAT WAS WRONG: same root cause as /api/health/[id] — the Vaccinations
// tab's "View" button goes to /health/vaccinations/[id], which fetches
// /api/health/vaccinations/${id}. No route.ts existed at that dynamic
// path (only the collection route for list + create), so the request
// 404'd and the page bounced straight back to /health.
//
// This file adds:
//   GET    /api/health/vaccinations/:id  — fetch one vaccination (detail page)
//   DELETE /api/health/vaccinations/:id  — delete it (detail page's delete button)
// (No PATCH — there's currently no edit page for vaccinations, only add/view/delete.)

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("health:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  const vaccination = await prisma.vaccination.findUnique({
    where: { id },
    include: {
      resident: { include: { purok: true } },
      recorder: { select: { id: true, username: true } },
    },
  });

  if (!vaccination) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(vaccination);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requirePermission("health:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const id = parseInt(params.id);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid id" }, { status: 400 });

  try {
    await prisma.vaccination.delete({ where: { id } });

    await logAudit({
      user_id:        parseInt(auth.session.user.id),
      action:         "DELETE",
      table_affected: "Vaccination",
      record_id:      id,
      details:        `Deleted vaccination record ID: ${id}`,
    });

    return NextResponse.json({ message: "Vaccination record deleted successfully" });
  } catch (e: any) {
    if (e.code === "P2025") {
      return NextResponse.json({ error: "NOT_FOUND", message: "Vaccination record not found." }, { status: 404 });
    }
    return NextResponse.json(
      { error: "SERVER_ERROR", message: e?.message || "Failed to delete vaccination record." },
      { status: 500 }
    );
  }
}