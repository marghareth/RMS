import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { DEFAULT_CERTIFICATE_TEMPLATES, CERTIFICATE_TYPE_VALUES } from "@/lib/certificateTemplateDefaults";

// Returns all certificate templates, auto-seeding any certificate type that
// doesn't have a row yet (e.g. right after this feature is first deployed)
// with its hardcoded default so every type always has an editable template.
export async function GET() {
  const auth = await requirePermission("certificates:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const existing = await prisma.certificateTemplate.findMany({
    include: { updater: { select: { username: true } } },
  });

  const missingTypes = CERTIFICATE_TYPE_VALUES.filter(
    (type) => !existing.some((t: { certificate_type: string }) => t.certificate_type === type)
  );

  if (missingTypes.length > 0) {
    await prisma.certificateTemplate.createMany({
      data: missingTypes.map((type) => ({
        certificate_type: type,
        title: DEFAULT_CERTIFICATE_TEMPLATES[type].title,
        body: DEFAULT_CERTIFICATE_TEMPLATES[type].body,
        closing_line: DEFAULT_CERTIFICATE_TEMPLATES[type].closing_line,
      })),
      skipDuplicates: true,
    });
  }

  const templates = await prisma.certificateTemplate.findMany({
    include: { updater: { select: { username: true } } },
    orderBy: { certificate_type: "asc" },
  });

  return NextResponse.json(templates);
}