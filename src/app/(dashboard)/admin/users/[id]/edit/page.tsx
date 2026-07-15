"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, UserCog, Eye, EyeOff, Users } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { UserMock, ROLES, Role } from "@/lib/mock/admin";

export default function EditUserPage() {
  const router = useRouter();
  const params = useParams();
  const userId = Number(params.id);

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // In place of the real GET /api/users/[id] call. Swap for the commented
  // block below once the database is connected.
  //const [original] = useState<UserMock | null>(() => MOCK_USERS.find((u) => u.id === userId) ?? null);
  //const [loading] = useState(false);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  const [original, setOriginal] = useState<UserMock | null>(null);
  const [loading, setLoading] = useState(true);
  //
  useEffect(() => {
     async function loadUser() {
       setLoading(true);
       try {
         const res = await fetch(`/api/users/${userId}`);
         if (!res.ok) throw new Error("Not found");
         const data = await res.json();
         setOriginal(data);
       } catch (e) {
         console.error(e);
       } finally {
         setLoading(false);
       }
     }
     loadUser();
   }, [userId]);

  const [role, setRole] = useState<Role | "">(original?.role ?? "");
  const [isActive, setIsActive] = useState(original?.is_active ?? true);
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
          >
            Back to Users
          </button>
        }
      />
    );
  }

  async function handleSubmit() {
    setError("");
    if (!role) {
      setError("Please select a role.");
      return;
    }
    if (newPassword && newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }

    setSubmitting(true);

    // ── MOCK SUBMIT ─────────────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    alert(`[MOCK] User "${original!.username}" updated.\nA real save will redirect back to the user list.`);
    router.push("/admin/users");

    // ── REAL SUBMIT (disabled until API/DB is wired up) ───────────────────
     try {
       const res = await fetch(`/api/users/${userId}`, {
         method: "PATCH",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           role,
           is_active: isActive,
           password: newPassword || undefined, // only sent if being reset
         }),
       });
       if (!res.ok) throw new Error("Failed to update user");
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
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Users
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">Edit User</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">{original.username}</p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
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
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
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

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/admin/users")}
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
          </div>
        </div>
      </div>
    </div>
  );
}