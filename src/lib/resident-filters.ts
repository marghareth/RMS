// FILE: src/lib/resident-filters.ts
//
// The Residents list's search and filters, turned into a Prisma `where`.
// Shared by GET /api/residents (the list) and GET /api/residents/export, so
// an export always contains exactly the residents the list is showing.

import type { Prisma, CivilStatus } from "@prisma/client";

export interface ResidentFilters {
  search: string;
  purok_id: number | null;
  sex: string | null;
  civil_status: string | null;
  is_archived: boolean;
  unassigned: boolean;
}

export function readResidentFilters(searchParams: URLSearchParams): ResidentFilters {
  const purok = parseInt(searchParams.get("purok_id") ?? "");
  return {
    search: searchParams.get("search") || "",
    purok_id: Number.isNaN(purok) ? null : purok,
    sex: searchParams.get("sex") || null,
    civil_status: searchParams.get("civil_status") || null,
    is_archived: searchParams.get("is_archived") === "true",
    unassigned: searchParams.get("unassigned") === "true",
  };
}

export function residentWhere(f: ResidentFilters): Prisma.ResidentWhereInput {
  return {
    is_archived: f.is_archived,
    AND: [
      f.search
        ? {
            OR: [
              { fname: { contains: f.search, mode: "insensitive" } },
              { lname: { contains: f.search, mode: "insensitive" } },
              { mname: { contains: f.search, mode: "insensitive" } },
            ],
          }
        : {},
      f.purok_id ? { purok_id: f.purok_id } : {},
      f.sex ? { sex: f.sex } : {},
      f.civil_status ? { civil_status: f.civil_status as CivilStatus } : {},
      f.unassigned ? { household_id: null } : {},
    ],
  };
}