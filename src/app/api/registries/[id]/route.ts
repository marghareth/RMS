// FILE: src/app/api/registries/[id]/route.ts
//
// One special-registry entry (Senior Citizen, PWD or 4Ps), by the
// SpecialRegistry row's own id — the same id the registry list
// (GET /api/registries) returns for each entry, and the one the detail
// slide-over (RegistryDetailSheet) and full page (RegistryDetail) pass in.
//
// BUGFIX (Nov 2026): this file used to be a copy of the residents
// endpoint. It looked up a *Resident* by the registry entry's id, so:
//   - GET came back 404 ("Entry not found") for almost every entry, or
//     showed the wrong person when a resident happened to share that id,
//     and never returned the registry fields (registry_type,
//     registered_at, disability_type) the screens need;
//   - DELETE ("Remove from registry") ARCHIVED THAT RESIDENT instead of
//     removing the registry entry;
//   - PATCH edited that resident's RBI record.
// GET and DELETE now work on the registry entry itself. PATCH is gone —
// nothing called it, and resident details are edited through
// /api/residents/[id].
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { logAudit } from "@/lib/audit";
import { withErrorHandling } from "@/lib/api-handler";

const REGISTRY_LABEL: Record<string, string> = {
  SENIOR_CITIZEN: "Senior Citizen",
  PWD: "PWD",
  FOUR_PS: "4Ps",
};

/** A positive whole-number id from the URL, or null for anything else ("abc", "0", "1.5"). */
function parseId(raw: string): number | null {
  if (!/^\d+$/.test(raw)) return null;
  const id = Number(raw);
  return id > 0 && Number.isSafeInteger(id) ? id : null;
}

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("registries:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseId(idParam);
  if (id === null) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entry = await prisma.specialRegistry.findUnique({
    where: { id },
    include: {
      resident: {
        include: {
          purok: true,
          household: { include: { _count: { select: { members: true } } } },
          // Only certificates that were actually released have an issue
          // date; pending or cancelled requests would print as "Jan 1, 1970".
          certificates: {
            where: { status: "RELEASED", issued_at: { not: null } },
            orderBy: { issued_at: "desc" },
            select: { id: true, certificate_type: true, issued_at: true },
          },
          barangay_ids: {
            orderBy: { issued_date: "desc" },
            select: { id: true, id_number: true, issued_date: true },
          },
          health_records: {
            orderBy: { recorded_at: "desc" },
            select: { id: true, record_type: true, notes: true, recorded_at: true },
          },
          vaccinations: {
            orderBy: { date_given: "desc" },
            select: { id: true, vaccine_name: true, date_given: true },
          },
        },
      },
    },
  });

  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(entry);
});

// Removes the resident from this one registry only. The resident's RBI
// record, and any other registry they're in, are left untouched.
export const DELETE = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("registries:delete", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseId(idParam);
  if (id === null) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const entry = await prisma.specialRegistry.findUnique({
    where: { id },
    include: { resident: { select: { fname: true, lname: true } } },
  });
  if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const label = REGISTRY_LABEL[entry.registry_type] ?? entry.registry_type;

  // Audit row in the same transaction, so a removal is never left unlogged.
  await prisma.$transaction(async (tx) => {
    await tx.specialRegistry.delete({ where: { id } });
    await logAudit(
      {
        user_id: parseInt(auth.session.user.id),
        action: "DELETE",
        table_affected: "SpecialRegistry",
        record_id: id,
        details: `Removed ${entry.resident.fname} ${entry.resident.lname} from the ${label} registry`,
      },
      tx
    );
  });

  return NextResponse.json({ message: "Removed from registry" });
});