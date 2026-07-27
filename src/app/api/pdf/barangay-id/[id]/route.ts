// FILE: src/app/api/pdf/barangay-id/[id]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createElement } from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { MOCK_ACTIVE_CAPTAIN, MOCK_BARANGAY_INFO } from "@/lib/mock/certificates";
import BarangayIdPDF from "@/lib/pdf/BarangayIdPDF";
import { withErrorHandling } from "@/lib/api-handler";

// @react-pdf/renderer renders with a real Node canvas/font pipeline, which
// isn't available on the Edge runtime — this route must run on Node.
export const runtime = "nodejs";

function calcAge(birthdate: Date): number {
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const m = today.getMonth() - birthdate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthdate.getDate())) age--;
  return age;
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" });
}

// Barangay IDs are valid for 3 years from issuance — the schema has no
// dedicated expiry column, so it's derived here the same way the on-screen
// card preview derives it (see lib/mock/barangayId.ts's expiryDate()).
function expiryDate(issuedDate: Date): Date {
  const d = new Date(issuedDate);
  d.setFullYear(d.getFullYear() + 3);
  return d;
}

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("barangay_id:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id: idParam } = await context!.params;
  const id = parseInt(idParam);
  if (Number.isNaN(id)) {
    return NextResponse.json({ error: "Invalid barangay ID id" }, { status: 400 });
  }

  const barangayId = await prisma.barangayId.findUnique({
    where: { id },
    include: { resident: { include: { household: true } } },
  });
  if (!barangayId) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { resident } = barangayId;
  const ext = resident.name_extension ? ` ${resident.name_extension}` : "";
  const mi = resident.mname ? ` ${resident.mname[0]}.` : "";
  const fullName = `${resident.lname}, ${resident.fname}${ext}${mi}`.toUpperCase();

  const buffer = await renderToBuffer(
    createElement(BarangayIdPDF, {
      idNumber: barangayId.id_number,
      fullName,
      address: resident.household?.address ?? "—",
      birthdateFormatted: formatShortDate(resident.birthdate),
      age: calcAge(resident.birthdate),
      sexShort: resident.sex === "MALE" ? "M" : "F",
      civilStatus: resident.civil_status,
      issuedDateFormatted: formatShortDate(barangayId.issued_date),
      validUntilFormatted: formatShortDate(expiryDate(barangayId.issued_date)),
      barangayName: MOCK_BARANGAY_INFO.name,
      city: MOCK_BARANGAY_INFO.city,
      province: MOCK_BARANGAY_INFO.province,
      captainName: MOCK_ACTIVE_CAPTAIN.name,
      captainPosition: MOCK_ACTIVE_CAPTAIN.position,
    })
  );

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="barangay-id-${barangayId.id}.pdf"`,
      "Content-Length": String(buffer.length),
    },
  });
});