// FILE: src/app/api/financial-categories/route.ts
//
// The Income / Expense category shortcuts on Add Transaction (Nov 2026).
// Staff edit them right on that form ("Edit list"), not in Admin.
//   GET → { INCOME: string[], EXPENSE: string[] }      (financial:read)
//   PUT { type: "INCOME" | "EXPENSE", categories: string[] }
//       → the saved list for that type                  (financial:write)
// See src/lib/category-lists.ts for storage and limits.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/lib/session";
import { withErrorHandling, ApiError } from "@/lib/api-handler";
import { readLists, saveList } from "@/lib/category-list-store";
import { cleanList, FINANCIAL_CATEGORY_DEFAULTS, FINANCIAL_TYPES, SETTING_KEYS } from "@/lib/category-lists";

export const GET = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("financial:read", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  return NextResponse.json(await readLists(SETTING_KEYS.financial, FINANCIAL_CATEGORY_DEFAULTS));
});

const putSchema = z.object({
  type: z.enum(FINANCIAL_TYPES),
  categories: z.array(z.unknown()),
});

export const PUT = withErrorHandling(async (req: NextRequest) => {
  const auth = await requirePermission("financial:write", req);
  if ("error" in auth) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = putSchema.parse(await req.json());
  const cleaned = cleanList(body.categories);
  if ("problem" in cleaned) throw new ApiError(400, "VALIDATION_ERROR", cleaned.problem);

  await saveList({
    key: SETTING_KEYS.financial[body.type],
    list: cleaned.list,
    userId: parseInt(auth.session.user.id),
    details: `Updated ${body.type === "INCOME" ? "income" : "expense"} categories: ${cleaned.list.join(", ")}`,
  });

  return NextResponse.json({ type: body.type, categories: cleaned.list });
});