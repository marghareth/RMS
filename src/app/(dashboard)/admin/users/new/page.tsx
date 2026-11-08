// FILE: src/app/(dashboard)/admin/users/new/page.tsx
//
// Passwords (Nov 2026): the initial password follows the same rules as any
// other (src/lib/password-policy.ts), and the new user must replace it at
// first sign-in, since whoever created the account knows it. Only an Admin
// can create an Admin account.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Eye, EyeOff } from "lucide-react";
import PageTutorial from "@/components/shared/PageTutorial";
import { ADMIN_TUTORIALS } from "@/lib/adminTutorials";
import { useSafeSession } from "@/lib/hooks/useSafeSession";
import { ROLES, Role } from "@/lib/mock/admin";
import PasswordRules from "@/components/account/PasswordRules";
import { passwordProblem } from "@/lib/password-policy";

export default function NewUserPage() {
  const router = useRouter();
  const { data: session } = useSafeSession();
  const actorIsAdmin = session?.user?.role === "ADMIN";

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState<Role | "">("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!username.trim()) {
      setError("Please enter a username.");
      return;
    }
    const problem = passwordProblem(password, username.trim());
    if (problem) {
      setError(problem);
      return;
    }
    if (!role) {
      setError("Please select a role.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password, role, full_name: fullName, position }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        // Duplicate usernames come back as 409 from the server, which is
        // the only authoritative check (the client never sees the user list).
        setError(data.issues?.[0]?.message || data.message || data.error || "Failed to create user.");
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
          <h1 className="text-[22px] font-bold text-[#1F2937] dark:text-white">Add User</h1>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">Create a new account with system access.</p>
        </div>
        <PageTutorial tutorial={ADMIN_TUTORIALS.usersNew} />
      </div>

      <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--brand-tint)">
            <UserPlus size={14} className="text-(--brand-fg-strong)" />
          </div>
          <p className="text-[14px] font-semibold text-[#1F2937] dark:text-white">Account details</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. secretary_dlrosario"
              className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor="new-full-name" className="mb-1.5 block text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
                Full name
              </label>
              <input
                id="new-full-name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Maria L. Santos"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
              />
            </div>
            <div>
              <label htmlFor="new-position" className="mb-1.5 block text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
                Position
              </label>
              <input
                id="new-position"
                value={position}
                onChange={(e) => setPosition(e.target.value)}
                maxLength={100}
                placeholder="e.g. Barangay Secretary"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
              />
            </div>
            <p className="text-[12px] text-[#9CA3AF] dark:text-[#737373] sm:col-span-2">Printed on the “Prepared by” line of reports this person prints.</p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Initial password"
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] py-2.5 pl-3 pr-10 text-[13px] outline-none focus:border-(--brand-line)"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:text-[#374151] dark:hover:text-[#D4D4D4]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <PasswordRules password={password} />
            <p className="mt-1 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
              They&rsquo;ll set their own the first time they sign in.
            </p>
          </div>

          <div>
            <label className="mb-1.5 block text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-(--brand-line)"
            >
              <option value="">Select role</option>
              {ROLES.filter((r) => actorIsAdmin || r.value !== "ADMIN").map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
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
              disabled={submitting}
              className="rounded-lg bg-(--brand) px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-60"
            >
              {submitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}