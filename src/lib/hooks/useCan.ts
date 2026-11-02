// FILE: src/lib/hooks/useCan.ts
//
// "May the signed-in user do this?" for screens — used to hide Add / Edit /
// Delete controls a role isn't allowed to use (access policy, Nov 2026; see
// src/lib/permission.ts).
//
//   const can = useCan();
//   {can("residents:write") && <button>Add Resident</button>}
//   {can("residents:delete") && <button>Archive</button>}
//
// This is for clarity only. Every API route still checks the permission on
// the server (requirePermission), so a hidden button is never the only thing
// standing between a view-only user and a change.
//
// While the session is still loading the role is unknown, so `can` answers
// false: write controls appear a moment after the page, never the reverse.

"use client";

import { useSession } from "next-auth/react";
import { hasPermission, isViewOnly } from "@/lib/permission";

export function useCan(): (permission: string | string[]) => boolean {
  const { data } = useSession();
  const role = data?.user?.role ?? "";
  return (permission) => {
    if (!role) return false;
    const all = Array.isArray(permission) ? permission : [permission];
    return all.every((p) => hasPermission(role, p));
  };
}

/** True for roles that can only view (Captain, Kagawad). False while loading. */
export function useIsViewOnly(): boolean {
  const { data } = useSession();
  const role = data?.user?.role;
  return !!role && isViewOnly(role);
}