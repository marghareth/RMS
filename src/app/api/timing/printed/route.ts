// FILE: src/app/api/timing/printed/route.ts
//
// POST { kind: "certificate" | "barangay-id", id } — called when staff
// press Print (or Download PDF) so the Processing Time report knows when a
// document was first printed. Only the first print is kept; later reprints
// don't move it.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";

const schema = z.object({
  kind: z.enum(["certificate", "barangay-id"]),
  id: z.number().int().positive(),
});

export const POST = withErrorHandling(async (req: NextRequest) => {
  const body = schema.parse(await req.json());
  const auth = await requirePermission(body.kind === "certificate" ? "certificates:read" : "barangay_id:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const where = { id: body.id, printed_at: null };
  const data = { printed_at: new Date() };
  const { count } =
    body.kind === "certificate"
      ? await prisma.certificate.updateMany({ where, data })
      : await prisma.barangayId.updateMany({ where, data });

  return NextResponse.json({ recorded: count > 0 });
});