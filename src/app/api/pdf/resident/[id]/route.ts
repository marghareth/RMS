// FILE: src/app/api/pdf/resident/[id]/route.ts
//
// GET ?sections=personal,household,certificates,health,assistance,blotter
// — a resident's profile as a PDF, with only the sections chosen in the
// "Print profile" dialog (and only those the user's role may see; see
// src/lib/resident-profile.ts). Every print is written to the audit log,
// since it contains personal information.
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { logAudit } from "@/lib/audit";
import { getLetterhead } from "@/lib/barangay-info";
import { barangayTitle, cityLineOf } from "@/lib/pdf/buildCertificatePdfProps";
import ResidentProfilePDF from "@/lib/pdf/ResidentProfilePDF";
import { allowedSections, ageOn, buildProfileSections, loadProfileResident, naturalName, PROFILE_SECTIONS, rbiNo } from "@/lib/resident-profile";

export const runtime = "nodejs";

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("residents:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) throw new ApiError(400, "BAD_ID", "Invalid resident id.");

  const keys = allowedSections(new URL(req.url).searchParams.get("sections"), auth.session.user.role);
  if (keys.length === 0) throw new ApiError(400, "NO_SECTIONS", "Choose at least one section to print.");

  const [resident, letterhead] = await Promise.all([loadProfileResident(prisma, id), getLetterhead()]);
  if (!resident) throw new ApiError(404, "NOT_FOUND", "Resident not found.");

  const now = new Date();
  const sections = buildProfileSections(resident, keys, now);
  const age = ageOn(new Date(resident.birthdate), now);
  const buffer = await renderToBuffer(
    createElement(ResidentProfilePDF, {
      barangayName: barangayTitle(letterhead.barangay.name),
      provinceLine: letterhead.barangay.province ? `Province of ${letterhead.barangay.province}` : "",
      cityLine: cityLineOf(letterhead.barangay.city),
      logo: letterhead.logos.barangay || undefined,
      fullName: naturalName(resident).toUpperCase(),
      subtitle: [`${age} years old`, resident.sex ? resident.sex[0] + resident.sex.slice(1).toLowerCase() : "", resident.purok?.name].filter(Boolean).join(" · "),
      rbiNo: rbiNo(resident.id),
      sections,
      printedBy: auth.session.user.username,
      printedAt: now.toLocaleString("en-US", { timeZone: "Asia/Manila", dateStyle: "long", timeStyle: "short" }),
      captainName: letterhead.captain.name,
      captainPosition: letterhead.captain.position,
    }) as Parameters<typeof renderToBuffer>[0]
  );

  const labels = PROFILE_SECTIONS.filter((x) => keys.includes(x.key)).map((x) => x.label.toLowerCase());
  await logAudit({
    user_id: parseInt(auth.session.user.id),
    action: "PRINT",
    table_affected: "Resident",
    record_id: resident.id,
    details: `Printed the profile of ${rbiNo(resident.id)} (${labels.join(", ")})`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="resident-profile-${rbiNo(resident.id)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
});