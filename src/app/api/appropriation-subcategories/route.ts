// FILE: src/app/api/appropriation-subcategories/route.ts
//
// Sub-categories under the official PS / MOOE / CO budget classes
// (Nov 2026). Staff edit them right on the Appropriations page
// ("Edit list"), not in Admin. PS, MOOE and CO themselves stay fixed.
//   GET → { PS: string[], MOOE: string[], CO: string[] }   (appropriations:read)
//   PUT { category: "PS" | "MOOE" | "CO", subcategories: string[] }
//       → the saved list for that class                      (appropriations:write)
// Renaming or removing a sub-category here doesn't change appropriations
// already saved with it — they keep the name they were saved with.
// See src/lib/category-lists.ts for storage and limits.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { readLists, saveList } from "@/lib/category-list-store";
import {
  APPROPRIATION_CLASSES, APPROPRIATION_SUBCATEGORY_DEFAULTS, cleanList, SETTING_KEYS,
} from "@/lib/category-lists";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("appropriations:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json(await readLists(SETTING_KEYS.appropriation, APPROPRIATION_SUBCATEGORY_DEFAULTS));
});

const putSchema = z.object({
  category: z.enum(APPROPRIATION_CLASSES),
  subcategories: z.array(z.unknown()),
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("appropriations:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = putSchema.parse(await req.json());
  const cleaned = cleanList(body.subcategories);
  if ("problem" in cleaned) throw new ApiError(400, "VALIDATION_ERROR", cleaned.problem);

  await saveList({
    key: SETTING_KEYS.appropriation[body.category],
    list: cleaned.list,
    userId: parseInt(auth.session.user.id),
    details: `Updated ${body.category} sub-categories: ${cleaned.list.join(", ")}`,
  });

  return NextResponse.json({ category: body.category, subcategories: cleaned.list });
});