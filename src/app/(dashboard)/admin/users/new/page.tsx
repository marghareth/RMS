"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, UserPlus, Eye, EyeOff } from "lucide-react";
import { ROLES, Role, MOCK_USERS } from "@/lib/mock/admin";

export default function NewUserPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
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
    if (MOCK_USERS.some((u) => u.username.toLowerCase() === username.trim().toLowerCase())) {
      setError("Username already exists.");
      return;
    }
    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!role) {
      setError("Please select a role.");
      return;
    }

    setSubmitting(true);

    // ── MOCK SUBMIT ─────────────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    alert(`[MOCK] User "${username}" created with role ${role}.\nA real save will redirect back to the user list.`);
    router.push("/admin/users");

    // ── REAL SUBMIT (disabled until API/DB is wired up) ───────────────────
    // try {
    //   const res = await fetch("/api/users", {
    //     method: "POST",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ username, password, role }),
    //   });
    //   if (!res.ok) {
    //     const data = await res.json();
    //     setError(data.error || "Failed to create user."); // e.g. 409 "Username already exists"
    //     return;
    //   }
    //   router.push("/admin/users");
    // } catch (e) {
    //   console.error(e);
    //   setError("Something went wrong while saving. Please try again.");
    // } finally {
    //   setSubmitting(false);
    // }
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
        <h1 className="text-xl font-bold text-[#1F2937]">Add User</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">Create a new account with system access.</p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
            <UserPlus size={14} className="text-[#1D4ED8]" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Account Details</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Username
            </label>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. secretary_dlrosario"
              className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
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

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
            >
              <option value="">Select role</option>
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
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
              {submitting ? "Creating..." : "Create User"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}