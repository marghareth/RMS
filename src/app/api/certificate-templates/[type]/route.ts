import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { DEFAULT_CERTIFICATE_TEMPLATES, CERTIFICATE_TYPE_VALUES, type CertificateTypeValue } from "@/lib/certificateTemplateDefaults";

function isValidType(type: string): type is CertificateTypeValue {
  return (CERTIFICATE_TYPE_VALUES as readonly string[]).includes(type);
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const auth = await requirePermission("certificates:read");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { type } = await params;
  if (!isValidType(type)) {
    return NextResponse.json({ error: "Invalid certificate type" }, { status: 400 });
  }

  const template = await prisma.certificateTemplate.upsert({
    where: { certificate_type: type },
    update: {},
    create: {
      certificate_type: type,
      title: DEFAULT_CERTIFICATE_TEMPLATES[type].title,
      body: DEFAULT_CERTIFICATE_TEMPLATES[type].body,
      closing_line: DEFAULT_CERTIFICATE_TEMPLATES[type].closing_line,
    },
    include: { updater: { select: { username: true } } },
  });

  return NextResponse.json(template);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  const auth = await requirePermission("certificates:write");
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { type } = await params;
  if (!isValidType(type)) {
    return NextResponse.json({ error: "Invalid certificate type" }, { status: 400 });
  }

  const body = await req.json();
  const { title, body: templateBody, closing_line } = body;
  const updatedBy = parseInt(auth.session.user.id);

  const updated = await prisma.certificateTemplate.upsert({
    where: { certificate_type: type },
    update: {
      ...(title !== undefined && { title }),
      ...(templateBody !== undefined && { body: templateBody }),
      ...(closing_line !== undefined && { closing_line }),
      updated_by: updatedBy,
    },
    create: {
      certificate_type: type,
      title: title ?? DEFAULT_CERTIFICATE_TEMPLATES[type].title,
      body: templateBody ?? DEFAULT_CERTIFICATE_TEMPLATES[type].body,
      closing_line: closing_line ?? DEFAULT_CERTIFICATE_TEMPLATES[type].closing_line,
      updated_by: updatedBy,
    },
    include: { updater: { select: { username: true } } },
  });

  return NextResponse.json(updated);
}