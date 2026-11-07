// FILE: src/components/admin/ResetRequestsPanel.tsx
//
// "Forgot password?" requests waiting for an Admin or Secretary, shown at
// the top of the Users page. Hidden when there are none.
//
// Approve issues a 30-minute temporary password (shown once); Deny closes
// the request without touching the account. Before either, the admin is
// reminded to confirm the person's identity, since anyone can type a
// username into the login page.
"use client";

import { useEffect, useState } from "react";
import { useSafeSession } from "@/lib/hooks/useSafeSession";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import TemporaryPasswordDialog, { IssuedPassword } from "@/components/admin/TemporaryPasswordDialog";
import { roleLabel, type Role } from "@/lib/mock/admin";

interface ResetRequest {
  id: number;
  requested_at: string;
  user: { id: number; username: string; role: Role };
}

function timeAgo(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

export default function ResetRequestsPanel() {
  const { data: session } = useSafeSession();
  const [requests, setRequests] = useState<ResetRequest[]>([]);
  const [pending, setPending] = useState<{ request: ResetRequest; action: "approve" | "deny" } | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<IssuedPassword | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/reset-requests")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setRequests(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function blockedReason(r: ResetRequest) {
    if (session?.user?.id === String(r.user.id)) return "Your own request";
    if (r.user.role === "ADMIN" && session?.user?.role !== "ADMIN") return "Needs an Admin";
    return "";
  }

  async function answer() {
    if (!pending) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/users/reset-requests/${pending.request.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pending.action }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 410) {
        setError(data.message || "Couldn't update the request. Try again.");
        return;
      }
      if (res.ok && pending.action === "approve") setIssued(data);
      setRequests((list) => list.filter((r) => r.id !== pending.request.id));
    } catch {
      setError("Couldn't reach the server. Try again.");
    } finally {
      setBusy(false);
      setPending(null);
    }
  }

  if (requests.length === 0 && !issued) return null;

  return (
    <>
      {requests.length > 0 && (
        <section className="mb-5 rounded-xl border border-[#E9EAEC] bg-white dark:border-[#333333] dark:bg-[#171717]">
          <div className="border-b border-[#E9EAEC] px-4 py-3 dark:border-[#333333]">
            <h2 className="text-[14px] font-semibold text-[#1F2937] dark:text-white">
              Password reset requests <span className="font-normal text-[#9CA3AF]">({requests.length})</span>
            </h2>
            <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
              Check with the person, face to face or by phone, before approving.
            </p>
          </div>
          <ul>
            {requests.map((r) => {
              const blocked = blockedReason(r);
              return (
                <li
                  key={r.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-[#F4F5F7] px-4 py-2.5 last:border-b-0 dark:border-[#262626]"
                >
                  <p className="min-w-0 flex-1 text-[13px] text-[#1F2937] dark:text-white">
                    <span className="font-medium">{r.user.username}</span>
                    <span className="text-[#9CA3AF]">
                      {" "}
                      · {roleLabel(r.user.role)} · {timeAgo(r.requested_at)}
                    </span>
                  </p>
                  {blocked ? (
                    <span className="text-[12px] text-[#9CA3AF]">{blocked}</span>
                  ) : (
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => setPending({ request: r, action: "deny" })}
                        className="text-[13px] text-[#6B7280] hover:text-[#1F2937] dark:text-[#A3A3A3] dark:hover:text-white"
                      >
                        Deny
                      </button>
                      <button
                        onClick={() => setPending({ request: r, action: "approve" })}
                        className="text-[13px] font-medium text-(--brand-fg) hover:text-(--brand-fg-strong)"
                      >
                        Approve
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          {error && <p className="px-4 pb-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}
        </section>
      )}

      <ConfirmDialog
        open={!!pending}
        title={pending?.action === "approve" ? "Approve this reset?" : "Deny this request?"}
        message={
          pending
            ? pending.action === "approve"
              ? `Only approve after confirming in person or by phone that ${pending.request.user.username} asked for this. You'll get a temporary password to hand over, and their current password stops working.`
              : `${pending.request.user.username}'s password stays as it is. They can send another request from the login page.`
            : ""
        }
        confirmLabel={pending?.action === "approve" ? "Approve" : "Deny"}
        variant={pending?.action === "approve" ? "warning" : "danger"}
        loading={busy}
        onConfirm={answer}
        onCancel={() => setPending(null)}
      />
      <TemporaryPasswordDialog issued={issued} onClose={() => setIssued(null)} />
    </>
  );
}