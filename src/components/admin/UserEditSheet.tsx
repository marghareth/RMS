// FILE: src/components/admin/UserEditSheet.tsx
//
// The "Edit User" form, as a slide-over instead of a full page navigation.
// Content mirrors (dashboard)/admin/users/[id]/edit/page.tsx (which still
// exists for direct links/bookmarks), just re-homed so it can render
// inside <Sheet> and be driven by a `userId` prop from the users list page.
//
// NOTE: the full-page version this was adapted from had a leftover mock
// submit path that ran (and short-circuited) before the real PATCH call.
// This sheet only calls the real endpoint.
//
// PASSWORDS (Nov 2026): the free-text "Reset Password" field is gone. An
// admin who typed a password for someone knew it; ResetPasswordButton
// issues a one-time temporary password instead. Only an Admin can change
// an Admin account or give the Admin role, so for a Secretary that option
// is hidden and Admin accounts are read-only here (the API enforces both).
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSafeSession } from "@/lib/hooks/useSafeSession";
import { UserCog, Users, ExternalLink } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import { UserMock, ROLES, Role } from "@/lib/mock/admin";
import { useCan } from "@/lib/hooks/useCan";
import ResetPasswordButton from "@/components/admin/ResetPasswordButton";

interface UserEditSheetProps {
  /** The user to edit, or null to keep the sheet closed. */
  userId: number | null;
  onClose: () => void;
  /** Called after a successful save, so the list page can refetch. */
  onSaved?: () => void;
}

export default function UserEditSheet({ userId, onClose, onSaved }: UserEditSheetProps) {
  const can = useCan();
  const router = useRouter();
  const { data: session } = useSafeSession();
  const actorIsAdmin = session?.user?.role === "ADMIN";
  const open = userId !== null;

  const [original, setOriginal] = useState<UserMock | null>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<Role | "">("");
  const [isActive, setIsActive] = useState(true);
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (userId !== null && userId !== syncedId) {
    setSyncedId(userId);
    setOriginal(null);
    setLoading(true);
    setError("");
  } else if (userId === null && syncedId !== null) {
    setSyncedId(null);
  }

  useEffect(() => {
    if (userId === null) return;
    let cancelled = false;

    fetch(`/api/users/${userId}`)
      .then((r) => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then((data: UserMock) => {
        if (cancelled) return;
        setOriginal(data);
        setRole(data.role);
        setIsActive(data.is_active);
        setFullName(data.full_name ?? "");
        setPosition(data.position ?? "");
      })
      .catch(() => { if (!cancelled) setOriginal(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  async function handleSubmit() {
    if (!original) return;
    setError("");
    if (!role) { setError("Please select a role."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${original.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          is_active: isActive,
          full_name: fullName,
          position,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Something went wrong while saving. Please try again.");
        return;
      }
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // A Secretary can view an Admin account but not change it.
  const lockedAdmin = !!original && original.role === "ADMIN" && !actorIsAdmin;

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent widthClassName="max-w-lg" className="p-0">
        {loading || !original ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "User not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={Users}
                  title="User not found"
                  description="This user account doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="min-w-0">
                <SheetTitle>Edit User</SheetTitle>
                <p className="mt-0.5 truncate text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">{original.username}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {can("users:write") && (<button
                  onClick={() => router.push(`/admin/users/${original.id}/edit`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                >
                  <ExternalLink size={15} />
                </button>)}
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody>
              <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--brand-tint)">
                    <UserCog size={14} className="text-(--brand-fg-strong)" />
                  </div>
                  <p className="text-[14px] font-semibold text-[#1F2937] dark:text-white">Account Details</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg bg-[#F9FAFB] dark:bg-[#171717] px-3 py-2.5">
                    <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">Username</p>
                    <p className="text-[13px] text-[#1F2937] dark:text-white">{original.username}</p>
                    <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Usernames cannot be changed.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label htmlFor="sheet-full-name" className="mb-1.5 block text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                        Full name
                      </label>
                      <input
                        id="sheet-full-name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        disabled={lockedAdmin}
                        maxLength={100}
                        placeholder="e.g. Maria L. Santos"
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
                      />
                    </div>
                    <div>
                      <label htmlFor="sheet-position" className="mb-1.5 block text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                        Position
                      </label>
                      <input
                        id="sheet-position"
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                        disabled={lockedAdmin}
                        maxLength={100}
                        placeholder="e.g. Barangay Secretary"
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
                      />
                    </div>
                    <p className="text-[12px] text-[#9CA3AF] dark:text-[#737373] sm:col-span-2">Printed on the “Prepared by” line of reports this person prints.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                      Role
                    </label>
                    <select
                      value={role}
                      disabled={lockedAdmin}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
                    >
                      {ROLES.filter((r) => actorIsAdmin || r.value !== "ADMIN" || original.role === "ADMIN").map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151] dark:text-[#D4D4D4]">
                    <input
                      type="checkbox"
                      checked={isActive}
                      disabled={lockedAdmin}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#D1D5DB] dark:border-[#404040] text-(--brand-fg) focus:ring-(--brand-line)"
                    />
                    Account active (can log in)
                  </label>
                  {lockedAdmin && (
                    <p className="text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Only an Admin can change an Admin account.</p>
                  )}

                  <div className="border-t border-[#F4F5F7] dark:border-[#262626] pt-4">
                    <ResetPasswordButton user={original} />
                  </div>

                  {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}
                </div>
              </div>
            </SheetBody>

            <SheetFooter>
              <button
                onClick={onClose}
                className="text-[13px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || lockedAdmin}
                className="rounded-lg bg-(--brand) px-6 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-60"
              >
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}