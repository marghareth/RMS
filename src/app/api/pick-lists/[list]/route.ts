// FILE: src/app/api/pick-lists/[list]/route.ts
//
// Single editable pick-lists (Nov 2026), edited with "Edit list" under the
// dropdown that uses them. See PICK_LISTS in src/lib/category-lists.ts.
//   GET  /api/pick-lists/revenue-categories   → { items: string[] }
//   PUT  /api/pick-lists/revenue-categories   { items: string[] } → { items }
//   (same for /api/pick-lists/equipment-types)
// Read and write permissions come from the list's entry in PICK_LISTS.
//
// Equipment types: until someone saves the list, the defaults are merged
// with the types already typed on existing equipment, so nothing a barangay
// has been using disappears from the dropdown.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { readLists, saveList } from "@/lib/category-list-store";
import { cleanList, isPickListName, LIST_MAX_ITEMS, PICK_LISTS, type PickListName } from "@/lib/category-lists";

async function listName(context: unknown): Promise<PickListName> {
  const params = await (context as { params: Promise<{ list: string }> } | undefined)?.params;
  const name = params?.list ?? "";
  if (!isPickListName(name)) throw new ApiError(404, "NOT_FOUND", "There is no list with that name.");
  return name;
}

export const GET = withErrorHandling(async (req: NextRequest, context) => {
  const name = await listName(context);
  const def = PICK_LISTS[name];
  const auth = await requirePermission(def.read, req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const saved = await prisma.systemSetting.findUnique({ where: { key: def.key } });
  let { items } = await readLists({ items: def.key }, { items: [...def.defaults] });

  if (!saved && name === "equipment-types") {
    const used = await prisma.equipment.findMany({
      where: { asset_type: { not: null } },
      select: { asset_type: true },
      distinct: ["asset_type"],
    });
    const merged = cleanList([...items, ...used.map((u) => u.asset_type ?? "")]);
    if ("list" in merged) items = merged.list.slice(0, LIST_MAX_ITEMS);
  }

  return NextResponse.json({ items });
});

const putSchema = z.object({ items: z.array(z.unknown()) });

export const PUT = withErrorHandling(async (req: NextRequest, context) => {
  const name = await listName(context);
  const def = PICK_LISTS[name];
  const auth = await requirePermission(def.write, req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = putSchema.parse(await req.json());
  const cleaned = cleanList(body.items);
  if ("problem" in cleaned) throw new ApiError(400, "VALIDATION_ERROR", cleaned.problem);

  await saveList({
    key: def.key,
    list: cleaned.list,
    userId: parseInt(auth.session.user.id),
    details: `Updated ${def.noun}: ${cleaned.list.join(", ")}`,
  });

  return NextResponse.json({ items: cleaned.list });
});