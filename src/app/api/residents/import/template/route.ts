// FILE: src/app/api/residents/import/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { withErrorHandling } from "@/lib/api-handler";
import { buildImportTemplateCsv } from "@/lib/residentImport";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("residents:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return new NextResponse(buildImportTemplateCsv(), {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="resident-import-template.csv"`,
    },
  });
});