// FILE: src/app/(dashboard)/account/password/page.tsx
//
// Change your own password. Every signed-in user can reach this page
// (linked from the user menu and the Security page). No approval needed:
// the current password proves it's them.
//
// It's also where an account on a temporary or admin-chosen password is
// held until it picks its own (middleware.ts redirects here). Either way,
// a successful change signs the account out everywhere, including here,
// and the user signs in again with the new password.
"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { useSafeSession } from "@/lib/hooks/useSafeSession";
import PageHeader from "@/components/shared/PageHeader";
import PasswordRules from "@/components/account/PasswordRules";
import { passwordProblem } from "@/lib/password-policy";

const inputClass =
  "w-full rounded-lg border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-(--brand-line) dark:border-[#333333] dark:bg-[#111111] dark:text-white";

function Field({
  label,
  value,
  onChange,
  autoComplete,
  show,
  children,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
  show: boolean;
  children?: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[13px] font-medium text-[#374151] dark:text-[#D4D4D4]">{label}</span>
      <input
        type={show ? "text" : "password"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        required
        className={inputClass}
      />
      {children}
    </label>
  );
}

export default function ChangePasswordPage() {
  const { data: session } = useSafeSession();
  const username = session?.user?.username ?? "";
  const required = !!session?.user?.mustChangePassword;

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const problem = passwordProblem(next, username);
    if (problem) return setError(problem);
    if (next !== confirm) return setError("The new passwords don't match.");

    setBusy(true);
    try {
      const res = await fetch("/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(
          res.status === 429
            ? "Too many attempts. Wait 15 minutes and try again."
            : data.message || "Couldn't change your password. Try again."
        );
        setBusy(false);
        return;
      }
      // The change already ended this session on the server; clear the
      // cookie too and go back to the login page.
      await signOut({ callbackUrl: "/login?changed=1" });
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Change Password"
        subtitle={
          required
            ? "You signed in with a temporary password. Set your own to keep going."
            : "You'll be signed out on all devices afterwards, including this one."
        }
      />

      <form
        onSubmit={handleSubmit}
        className="max-w-md space-y-4 rounded-xl border border-[#E9EAEC] bg-white p-5 dark:border-[#333333] dark:bg-[#171717]"
      >
        <Field
          label={required ? "Temporary password" : "Current password"}
          value={current}
          onChange={setCurrent}
          autoComplete="current-password"
          show={show}
        />
        <Field label="New password" value={next} onChange={setNext} autoComplete="new-password" show={show}>
          <PasswordRules password={next} />
        </Field>
        <Field
          label="Confirm new password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          show={show}
        />

        <label className="flex items-center gap-2 text-[13px] text-[#4B5563] dark:text-[#A3A3A3]">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          Show passwords
        </label>

        {error && <p className="text-[13px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

        <div className="pt-1">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-(--brand-hover) disabled:opacity-60"
          >
            {busy ? "Saving…" : "Change password"}
          </button>
        </div>
      </form>
    </div>
  );
}