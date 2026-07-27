// FILE: src/app/api/certificate-templates/[type]/reset/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { DEFAULT_CERTIFICATE_TEMPLATES, CERTIFICATE_TYPE_VALUES, type CertificateTypeValue } from "@/lib/certificateTemplateDefaults";

function isValidType(type: string): type is CertificateTypeValue {
  return (CERTIFICATE_TYPE_VALUES as readonly string[]).includes(type);
}

// Restores a certificate type's template to its hardcoded default wording.
export const POST = withErrorHandling(async (req: NextRequest, context) => {
  const auth = await requirePermission("certificates:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { type } = await context!.params;
  if (!isValidType(type)) {
    throw new ApiError(400, "INVALID_TYPE", "Invalid certificate type");
  }

  const defaults = DEFAULT_CERTIFICATE_TEMPLATES[type];

  const reset = await prisma.certificateTemplate.upsert({
    where: { certificate_type: type },
    update: {
      title: defaults.title,
      body: defaults.body,
      closing_line: defaults.closing_line,
      updated_by: null,
    },
    create: {
      certificate_type: type,
      title: defaults.title,
      body: defaults.body,
      closing_line: defaults.closing_line,
    },
    include: { updater: { select: { username: true } } },
  });

  return NextResponse.json(reset);
});