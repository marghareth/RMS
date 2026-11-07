// FILE: src/app/(dashboard)/admin/users/[id]/edit/page.tsx
//
// Full-page version of the Edit User panel (UserEditSheet.tsx), kept for
// direct links and bookmarks. Same rules:
//   - no password field: "Reset password" issues a one-time temporary
//     password instead (ResetPasswordButton);
//   - only an Admin can change an Admin account or give the Admin role.
//
// BUGFIXES (Nov 2026): Save used to run a leftover mock first (a 500 ms
// wait, a browser alert, then a redirect) before the real PATCH, and the
// role and active fields started empty because they were set before the
// user had loaded, so Save always said "Please select a role."
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSafeSession } from "@/lib/hooks/useSafeSession";
import { ArrowLeft, UserCog, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import PageTutorial from "@/components/shared/PageTutorial";
import ResetPasswordButton from "@/components/admin/ResetPasswordButton";
import { ADMIN_TUTORIALS } from "@/lib/adminTutorials";
import { UserMock, ROLES, Role } from "@/lib/mock/admin";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);
  const { data: session } = useSafeSession();
  const actorIsAdmin = session?.user?.role === "ADMIN";

  const [original, setOriginal] = useState<UserMock | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<Role | "">("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/users/${userId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data: UserMock) => {
        if (cancelled) return;
        setOriginal(data);
        setRole(data.role);
        setIsActive(data.is_active);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
      </div>
    );
  }

  if (!original) {
    return (
      <EmptyState
        icon={Users}
        title="User not found"
        description="This user account doesn't exist or may have been removed."
        action={
          <button
            onClick={() => router.push("/admin/users")}
            className="rounded-lg bg-(--brand) px-4 py-2 text-[12px] font-bold text-white transition hover:bg-(--brand-hover)"
          >
            Back to Users
          </button>
        }
      />
    );
  }

  // A Secretary can view an Admin account but not change it.
  const lockedAdmin = original.role === "ADMIN" && !actorIsAdmin;

  async function handleSubmit() {
    setError("");
    if (!role) {
      setError("Please select a role.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, is_active: isActive }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.message || "Something went wrong while saving. Please try again.");
        return;
      }
      router.push("/admin/users");
    } catch (e) {
      console.error(e);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <button
        onClick={() => router.push("/admin/users")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Users
      </button>

      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold text-[#1F2937] dark:text-white">Edit User</h1>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">{original.username}</p>
        </div>
        <PageTutorial tutorial={ADMIN_TUTORIALS.usersEdit} />
      </div>

      <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--brand-tint)">
            <UserCog size={14} className="text-(--brand-fg-strong)" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Account Details</p>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg bg-[#F9FAFB] dark:bg-[#171717] px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Username</p>
            <p className="text-[13px] text-[#1F2937] dark:text-white">{original.username}</p>
            <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">Usernames cannot be changed.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
              Role
            </label>
            <select
              value={role}
              disabled={lockedAdmin}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
            >
              {ROLES.filter((r) => actorIsAdmin || r.value !== "ADMIN" || original.role === "ADMIN").map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/admin/users")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || lockedAdmin}
              className="rounded-lg bg-(--brand) px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}