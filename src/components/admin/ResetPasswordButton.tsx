// FILE: src/components/admin/ResetPasswordButton.tsx
//
// "Reset password" on a user's edit panel and edit page. Replaces the old
// free-text "Reset Password" field: instead of typing a password for
// someone (and knowing it), the admin gets a one-time temporary password
// to hand over (POST /api/users/[id]/reset-password).
"use client";

import { useState } from "react";
import { KeyRound } from "lucide-react";
import { useSafeSession } from "@/lib/hooks/useSafeSession";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import TemporaryPasswordDialog, { IssuedPassword } from "@/components/admin/TemporaryPasswordDialog";

export default function ResetPasswordButton({
  user,
}: {
  user: { id: number; username: string; role: string; is_active: boolean };
}) {
  const { data: session } = useSafeSession();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedPassword | null>(null);
  const [error, setError] = useState("");

  const isSelf = session?.user?.id === String(user.id);
  const adminOnly = user.role === "ADMIN" && session?.user?.role !== "ADMIN";
  const blockedReason = isSelf
    ? "To change your own password, use Change password in your account menu."
    : adminOnly
      ? "Only an Admin can reset an Admin's password."
      : !user.is_active
        ? "Reactivate this account before resetting its password."
        : "";

  async function reset() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/users/${user.id}/reset-password`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Couldn't reset the password. Try again.");
        return;
      }
      setIssued(data);
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <div>
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Password</p>
      {blockedReason ? (
        <p className="text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">{blockedReason}</p>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-2 text-[12px] font-bold text-[#374151] transition hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-[#D4D4D4] dark:hover:bg-[#1F1F1F]"
          >
            <KeyRound size={13} />
            Reset password
          </button>
          <p className="mt-1.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
            Gives you a temporary password to hand over. It expires in 30 minutes.
          </p>
        </>
      )}
      {error && <p className="mt-2 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

      <ConfirmDialog
        open={confirming}
        title="Reset this password?"
        message={`${user.username} will be signed out everywhere and their current password will stop working. Only do this after confirming it's really them asking.`}
        confirmLabel="Reset password"
        variant="warning"
        loading={busy}
        onConfirm={reset}
        onCancel={() => setConfirming(false)}
      />
      <TemporaryPasswordDialog issued={issued} onClose={() => setIssued(null)} />
    </div>
  );
}