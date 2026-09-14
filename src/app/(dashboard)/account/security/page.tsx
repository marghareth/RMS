// FILE: src/app/(dashboard)/account/security/page.tsx
//
// Self-service two-factor auth enrollment. Every signed-in user can
// reach this page (linked from the user menu in Topbar.tsx) — there's no
// `permission` gate on it because it only ever acts on the current
// user's own account, the same way changing your own password would.

"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, ShieldOff, Copy, Check, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";

type Status = { enabled: boolean; recommended: boolean; backupCodesRemaining: number };

export default function SecuritySettingsPage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);

  // Enrollment flow state
  const [enrolling, setEnrolling] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [manualSecret, setManualSecret] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  // Disable flow state
  const [disabling, setDisabling] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [disableToken, setDisableToken] = useState("");

  async function loadStatus() {
    const res = await fetch("/api/account/mfa/status");
    if (res.ok) setStatus(await res.json());
    setLoading(false);
  }

  useEffect(() => {
    let ignore = false;

    async function initialLoad() {
      const res = await fetch("/api/account/mfa/status");
      if (ignore) return;
      if (res.ok) setStatus(await res.json());
      setLoading(false);
    }

    initialLoad();

    return () => {
      ignore = true;
    };
  }, []);

  async function startEnrollment() {
    setError("");
    setBusy(true);
    const res = await fetch("/api/account/mfa/setup", { method: "POST" });
    setBusy(false);
    if (!res.ok) {
      setError("Couldn't start setup. Try again.");
      return;
    }
    const data = await res.json();
    setQrDataUrl(data.qrDataUrl);
    setManualSecret(data.secret);
    setEnrolling(true);
  }

  async function confirmEnrollment(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/account/mfa/enable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: confirmCode }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.message || "That code didn't match. Try again.");
      return;
    }
    const data = await res.json();
    setBackupCodes(data.backupCodes);
    setEnrolling(false);
    await loadStatus();
  }

  async function submitDisable(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/account/mfa/disable", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: disablePassword, token: disableToken }),
    });
    setBusy(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(
        data.error === "INVALID_PASSWORD"
          ? "That password isn't right."
          : data.error === "INVALID_CODE"
          ? "That code didn't match."
          : "Couldn't disable MFA. Try again."
      );
      return;
    }
    setDisabling(false);
    setDisablePassword("");
    setDisableToken("");
    await loadStatus();
  }

  function copyBackupCodes() {
    if (!backupCodes) return;
    navigator.clipboard.writeText(backupCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div>
      <PageHeader
        title="Security"
        subtitle="Manage two-factor authentication for your own account."
      />

      {loading ? (
        <p className="text-[13px] text-[#9CA3AF]">Loading…</p>
      ) : backupCodes ? (
        // ── Just enabled: show backup codes once ──────────────────
        <div className="max-w-lg rounded-xl border border-[#E9EAEC] bg-white p-6 dark:border-[#333333] dark:bg-[#171717]">
          <div className="mb-3 flex items-center gap-2 text-[#16A34A]">
            <ShieldCheck size={18} />
            <h2 className="text-[15px] font-semibold text-[#1F2937] dark:text-white">
              Two-factor authentication is on
            </h2>
          </div>
          <p className="text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
            Save these backup codes somewhere safe. Each one can be used once to sign in if you
            lose access to your authenticator app — they won&rsquo;t be shown again.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2 rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] p-4 font-mono text-[13px] text-[#1F2937] dark:border-[#333333] dark:bg-[#111111] dark:text-white">
            {backupCodes.map((code) => (
              <span key={code}>{code}</span>
            ))}
          </div>
          <div className="mt-4 flex gap-2">
            <button
              onClick={copyBackupCodes}
              className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-2 text-[13px] font-medium text-[#1F2937] transition hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-white dark:hover:bg-[#1F1F1F]"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy codes"}
            </button>
            <button
              onClick={() => setBackupCodes(null)}
              className="rounded-lg bg-[#1F2937] px-3 py-2 text-[13px] font-medium text-white transition hover:bg-[#111827] dark:bg-white dark:text-[#111111]"
            >
              Done
            </button>
          </div>
        </div>
      ) : enrolling ? (
        // ── Enrollment: scan QR, confirm code ─────────────────────
        <div className="max-w-lg rounded-xl border border-[#E9EAEC] bg-white p-6 dark:border-[#333333] dark:bg-[#171717]">
          <h2 className="mb-1 text-[15px] font-semibold text-[#1F2937] dark:text-white">
            Scan this with your authenticator app
          </h2>
          <p className="mb-4 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
            Google Authenticator, Authy, 1Password, or any TOTP-compatible app will work.
          </p>

          {qrDataUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={qrDataUrl} alt="MFA enrollment QR code" className="mb-4 h-44 w-44 rounded-lg border border-[#E9EAEC] dark:border-[#333333]" />
          )}

          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
            Can&rsquo;t scan? Enter this key manually
          </p>
          <code className="mb-4 block break-all rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] px-3 py-2 text-[12px] text-[#1F2937] dark:border-[#333333] dark:bg-[#111111] dark:text-white">
            {manualSecret}
          </code>

          <form onSubmit={confirmEnrollment} className="flex flex-col gap-3">
            <label className="text-[11px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
              Enter the 6-digit code it shows
            </label>
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value)}
              placeholder="123456"
              inputMode="numeric"
              maxLength={6}
              className="w-40 rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[15px] tracking-widest text-[#1F2937] outline-none focus:border-[#3B82F6] dark:border-[#333333] dark:bg-[#111111] dark:text-white"
            />
            {error && <p className="text-[12px] text-red-500">{error}</p>}
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-[#1F2937] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#111827] disabled:opacity-60 dark:bg-white dark:text-[#111111]"
              >
                Confirm and turn on
              </button>
              <button
                type="button"
                onClick={() => setEnrolling(false)}
                className="rounded-lg px-4 py-2 text-[13px] font-medium text-[#6B7280] transition hover:bg-[#F4F5F7] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        // ── Current status ────────────────────────────────────────
        <div className="max-w-lg rounded-xl border border-[#E9EAEC] bg-white p-6 dark:border-[#333333] dark:bg-[#171717]">
          <div className="flex items-center gap-2">
            {status?.enabled ? (
              <ShieldCheck size={18} className="text-[#16A34A]" />
            ) : (
              <ShieldOff size={18} className="text-[#9CA3AF]" />
            )}
            <h2 className="text-[15px] font-semibold text-[#1F2937] dark:text-white">
              Two-factor authentication is {status?.enabled ? "on" : "off"}
            </h2>
          </div>

          {!status?.enabled && status?.recommended && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Your role can access financials, blotter cases, and resident records for the whole
              barangay. Turning this on is strongly recommended.
            </div>
          )}

          {status?.enabled && (
            <p className="mt-2 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
              {status.backupCodesRemaining} backup code{status.backupCodesRemaining === 1 ? "" : "s"} remaining.
            </p>
          )}

          <div className="mt-4">
            {status?.enabled ? (
              disabling ? (
                <form onSubmit={submitDisable} className="flex flex-col gap-3">
                  <input
                    type="password"
                    placeholder="Your password"
                    value={disablePassword}
                    onChange={(e) => setDisablePassword(e.target.value)}
                    required
                    className="rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none focus:border-[#3B82F6] dark:border-[#333333] dark:bg-[#111111] dark:text-white"
                  />
                  <input
                    placeholder="6-digit code or backup code"
                    value={disableToken}
                    onChange={(e) => setDisableToken(e.target.value)}
                    required
                    className="rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none focus:border-[#3B82F6] dark:border-[#333333] dark:bg-[#111111] dark:text-white"
                  />
                  {error && <p className="text-[12px] text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={busy}
                      className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      Turn off
                    </button>
                    <button
                      type="button"
                      onClick={() => setDisabling(false)}
                      className="rounded-lg px-4 py-2 text-[13px] font-medium text-[#6B7280] transition hover:bg-[#F4F5F7] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setDisabling(true)}
                  className="rounded-lg border border-[#E9EAEC] px-4 py-2 text-[13px] font-medium text-[#1F2937] transition hover:bg-[#F4F5F7] dark:border-[#333333] dark:text-white dark:hover:bg-[#1F1F1F]"
                >
                  Turn off
                </button>
              )
            ) : (
              <button
                onClick={startEnrollment}
                disabled={busy}
                className="rounded-lg bg-[#1F2937] px-4 py-2 text-[13px] font-medium text-white transition hover:bg-[#111827] disabled:opacity-60 dark:bg-white dark:text-[#111111]"
              >
                Set up two-factor authentication
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}