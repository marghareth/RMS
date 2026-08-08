// src/components/admin/UserEditSheet.tsx
//
// The "Edit User" form, as a slide-over instead of a full page navigation.
// Content mirrors (dashboard)/admin/users/[id]/edit/page.tsx (which still
// exists for direct links/bookmarks), just re-homed so it can render
// inside <Sheet> and be driven by a `userId` prop from the users list page.
//
// NOTE: the full-page version this was adapted from had a leftover mock
// submit path that ran (and short-circuited) before the real PATCH call.
// This sheet only calls the real endpoint.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { UserCog, Eye, EyeOff, Users, ExternalLink } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import { UserMock, ROLES, Role } from "@/lib/mock/admin";

interface UserEditSheetProps {
  /** The user to edit, or null to keep the sheet closed. */
  userId: number | null;
  onClose: () => void;
  /** Called after a successful save, so the list page can refetch. */
  onSaved?: () => void;
}

export default function UserEditSheet({ userId, onClose, onSaved }: UserEditSheetProps) {
  const router = useRouter();
  const open = userId !== null;

  const [original, setOriginal] = useState<UserMock | null>(null);
  const [loading, setLoading] = useState(true);

  const [role, setRole] = useState<Role | "">("");
  const [isActive, setIsActive] = useState(true);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (userId !== null && userId !== syncedId) {
    setSyncedId(userId);
    setOriginal(null);
    setLoading(true);
    setError("");
    setNewPassword("");
    setShowPassword(false);
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
      })
      .catch(() => { if (!cancelled) setOriginal(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [userId]);

  async function handleSubmit() {
    if (!original) return;
    setError("");
    if (!role) { setError("Please select a role."); return; }
    if (newPassword && newPassword.length < 8) { setError("New password must be at least 8 characters."); return; }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${original.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          is_active: isActive,
          password: newPassword || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update user");
      onSaved?.();
      onClose();
    } catch (e) {
      console.error(e);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

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
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
                <p className="mt-0.5 truncate text-[12px] text-[#9CA3AF]">{original.username}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`/admin/users/${original.id}/edit`)}
                  title="Open full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody>
              <div className="rounded-xl border border-[#E9EAEC] bg-white p-4">
                <div className="mb-4 flex items-center gap-2">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
                    <UserCog size={14} className="text-[#1D4ED8]" />
                  </div>
                  <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Account Details</p>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg bg-[#F9FAFB] px-3 py-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Username</p>
                    <p className="text-[13px] text-[#1F2937]">{original.username}</p>
                    <p className="mt-1 text-[11px] text-[#9CA3AF]">Usernames cannot be changed.</p>
                  </div>

                  <div>
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as Role)}
                      className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
                    >
                      {ROLES.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>

                  <label className="flex items-center gap-2 text-[12px] font-medium text-[#374151]">
                    <input
                      type="checkbox"
                      checked={isActive}
                      onChange={(e) => setIsActive(e.target.checked)}
                      className="h-3.5 w-3.5 rounded border-[#D1D5DB] text-[#3B82F6] focus:ring-[#3B82F6]"
                    />
                    Account active (can log in)
                  </label>

                  <div className="border-t border-[#F4F5F7] pt-4">
                    <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                      Reset Password <span className="font-normal normal-case text-[#9CA3AF]">(leave blank to keep current)</span>
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="New password (min. 8 characters)"
                        className="w-full rounded-lg border border-[#E9EAEC] py-2.5 pl-3 pr-10 text-[13px] outline-none focus:border-[#3B82F6]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] transition hover:text-[#374151]"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}
                </div>
              </div>
            </SheetBody>

            <SheetFooter>
              <button
                onClick={onClose}
                className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
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