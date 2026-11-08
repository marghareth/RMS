// FILE: src/lib/category-lists.ts
//
// Editable pick-lists (Nov 2026), managed by staff right on the page that
// uses them instead of in Admin → Settings:
//
//   • Financial record categories — the Income / Expense shortcut buttons
//     on Add Transaction (/financial/new). Picking one fills the
//     Description, so they're shortcuts only; nothing else depends on the
//     exact wording.
//   • Appropriation sub-categories — the optional second level under the
//     official PS / MOOE / CO budget classes (/finance/appropriations).
//     PS, MOOE and CO themselves stay fixed because the Budget Overview
//     and the official format group by them.
//   • Revenue categories (/finance/revenues) and equipment types
//     (/equipment/new, /equipment/[id]/edit) — plain pick-lists, edited
//     with "Edit list" under the dropdown (PUT /api/pick-lists/[list]).
//
// Each list is stored as a JSON array in one SystemSetting row (keys in
// SETTING_KEYS). Until someone edits a list, the defaults below are used.
// This file is shared by the API routes and the screens, so it must stay
// free of server-only imports.

export const FINANCIAL_TYPES = ["INCOME", "EXPENSE"] as const;
export type FinancialListType = (typeof FINANCIAL_TYPES)[number];

export const APPROPRIATION_CLASSES = ["PS", "MOOE", "CO"] as const;
export type AppropriationClass = (typeof APPROPRIATION_CLASSES)[number];

export const FINANCIAL_CATEGORY_DEFAULTS: Record<FinancialListType, string[]> = {
  INCOME: [
    "Barangay Clearance Fees",
    "Certificate Fees",
    "Business Permit Fees",
    "Market/Stall Rental",
    "IRA Allotment",
    "Donations",
    "Other Income",
  ],
  EXPENSE: [
    "Honoraria",
    "Office Supplies",
    "Utilities",
    "Infrastructure/Repairs",
    "Relief Assistance",
    "Equipment Purchase",
    "Events & Assemblies",
    "Other Expense",
  ],
};

export const APPROPRIATION_SUBCATEGORY_DEFAULTS: Record<AppropriationClass, string[]> = {
  PS: ["Honoraria", "Cash Gift", "Year-end Bonus", "Productivity Incentive", "Other Personnel Benefits"],
  MOOE: [
    "Office Supplies",
    "Travelling Expenses",
    "Training Expenses",
    "Electricity",
    "Water",
    "Fuel, Oil and Lubricants",
    "Repairs and Maintenance",
    "Other MOOE",
  ],
  CO: ["Infrastructure", "Office Equipment", "Furniture and Fixtures", "Motor Vehicles", "Other Capital Outlay"],
};

export const REVENUE_CATEGORY_DEFAULTS = [
  "Clearance and Certification Fees",
  "Business Permit Fees",
  "Real Property Tax Share",
  "Community Tax Share",
  "NTA / IRA Share",
  "Rental Income",
  "Donations and Grants",
  "Other Income",
];

export const EQUIPMENT_TYPE_DEFAULTS = [
  "Furniture",
  "Electronics",
  "Office Equipment",
  "Sound System",
  "Tools",
  "Appliances",
  "Vehicles",
  "Medical Equipment",
  "Other",
];

/**
 * Single pick-lists served by /api/pick-lists/[list]: storage key, defaults,
 * who may read / edit, and how the audit log names it.
 */
export const PICK_LISTS = {
  "revenue-categories": {
    key: "list_revenue_categories",
    defaults: REVENUE_CATEGORY_DEFAULTS,
    read: "revenues:read",
    write: "revenues:write",
    noun: "revenue categories",
  },
  "equipment-types": {
    key: "list_equipment_types",
    defaults: EQUIPMENT_TYPE_DEFAULTS,
    read: "equipment:read",
    write: "equipment:write",
    noun: "equipment types",
  },
} as const;
export type PickListName = keyof typeof PICK_LISTS;
export const isPickListName = (v: string): v is PickListName => Object.prototype.hasOwnProperty.call(PICK_LISTS, v);

export const SETTING_KEYS = {
  financial: {
    INCOME: "list_financial_income_categories",
    EXPENSE: "list_financial_expense_categories",
  } satisfies Record<FinancialListType, string>,
  appropriation: {
    PS: "list_appropriation_subcategories_ps",
    MOOE: "list_appropriation_subcategories_mooe",
    CO: "list_appropriation_subcategories_co",
  } satisfies Record<AppropriationClass, string>,
};

export const LIST_MAX_ITEMS = 40;
export const ITEM_MAX_LENGTH = 60;

/**
 * Tidies a list someone submitted: trims each entry, collapses inner
 * spaces, drops blanks and case-insensitive duplicates (first one wins).
 * Returns a problem message instead when the result can't be saved.
 */
export function cleanList(input: unknown): { list: string[] } | { problem: string } {
  if (!Array.isArray(input)) return { problem: "The list must be a list of names." };

  const list: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    if (typeof raw !== "string") return { problem: "Every entry must be text." };
    const item = raw.trim().replace(/\s+/g, " ");
    if (!item) continue;
    if (item.length > ITEM_MAX_LENGTH) {
      return { problem: `"${item.slice(0, 20)}…" is too long. Keep each name to ${ITEM_MAX_LENGTH} characters.` };
    }
    const key = item.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(item);
  }

  if (list.length === 0) return { problem: "Keep at least one entry in the list." };
  if (list.length > LIST_MAX_ITEMS) return { problem: `A list can have at most ${LIST_MAX_ITEMS} entries.` };
  return { list };
}

/** Reads a stored list, falling back to the defaults if it's missing or unreadable. */
export function parseStoredList(value: string | null | undefined, fallback: string[]): string[] {
  if (!value) return [...fallback];
  try {
    const result = cleanList(JSON.parse(value));
    return "list" in result ? result.list : [...fallback];
  } catch {
    return [...fallback];
  }
}