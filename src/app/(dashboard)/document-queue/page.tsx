// FILE: src/app/(dashboard)/document-queue/page.tsx
//
// Document Queue — the working view of the Document Request Workflow.
// Shows requests that still need action (PENDING / PROCESSING by default,
// with an "All" option), and lets front-desk staff advance a request
// through the queue or cancel it. Released documents live on the
// Document Release page instead (see /document-release).
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Inbox,
  Search,
  Plus,
  User,
  FileText,
  Wallet,
  Calendar,
  ShieldCheck,
  PlayCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { ListSummary, ListTabs } from "@/components/shared/ListUI";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import {
  CertificateMock,
  certTypeLabel,
  residentFullName,
  formatISODateTime,
  PAYMENT_STATUS_LABELS,
  RequestStatus,
} from "@/lib/mock/certificates";
import { useCan } from "@/lib/hooks/useCan";

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value?: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <Icon
        size={14}
        className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]"
      />
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-[#9CA3AF] dark:text-[#A3A3A3]">
          {label}
        </p>
        <p className="text-[13px] text-[#1F2937] dark:text-white">
          {value || "—"}
        </p>
      </div>
    </div>
  );
}

/** "Nov 1, 3:42 PM" — short enough to sit next to the document type in the list. */
function shortDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

type QueueFilter = "ACTIVE" | "PENDING" | "PROCESSING" | "ALL";

export default function DocumentQueuePage() {
  const can = useCan();
  const router = useRouter();

  const [items, setItems] = useState<CertificateMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<QueueFilter>("ACTIVE");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (search) params.set("search", search);
      if (filter === "PENDING" || filter === "PROCESSING")
        params.set("status", filter);
      const res = await fetch(`/api/certificates?${params}`);
      const data = await res.json();
      let list: CertificateMock[] = data.certificates ?? [];
      if (filter === "ACTIVE")
        list = list.filter(
          (c) => c.status === "PENDING" || c.status === "PROCESSING",
        );
      setItems(list);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, filter]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const selected = items.find((c) => c.id === selectedId) ?? null;

  async function runAction(action: "process" | "cancel", body?: object) {
    if (!selected) return;
    setActionBusy(true);
    setActionError("");
    try {
      const res = await fetch(`/api/certificates/${selected.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body ?? {}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Action failed");
      await load();
    } catch (e: any) {
      setActionError(e?.message || "Something went wrong. Please try again.");
    } finally {
      setActionBusy(false);
    }
  }

  const pendingCount = items.filter((c) => c.status === "PENDING").length;
  const processingCount = items.filter((c) => c.status === "PROCESSING").length;
  const unpaidCount = items.filter(
    (c) => c.payment_status === "PENDING",
  ).length;

  return (
    <div>
      <PageHeader
        title="Document Queue"
        subtitle={
          <span>
            <ListSummary
              items={[
                `${pendingCount} pending`,
                `${processingCount} processing`,
                unpaidCount > 0 && `${unpaidCount} unpaid`,
              ]}
            />
          </span>
        }
        actions={
          can("certificates:write") && (
            <button
              onClick={() => router.push("/certificates/new")}
              className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover)"
            >
              <Plus size={15} />
              New Request
            </button>
          )
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── List ── */}
        <div className="lg:col-span-1">
          <div
            data-tour="page-document-queue-list"
            className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717]"
          >
            <div className="border-b border-[#E9EAEC] px-4 pt-4 dark:border-[#262626]">
              <div
                data-tour="page-document-queue-search"
                className="relative mb-3"
              >
                <Search
                  size={14}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#A3A3A3]"
                />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search queue #, name…"
                  className="w-full rounded-lg border border-[#E5E7EB] dark:border-[#333333] bg-white dark:bg-[#171717] py-2 pl-8 pr-3 text-[12px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-(--brand-line)"
                />
              </div>
              <div data-tour="page-document-queue-filters">
                <ListTabs
                  label="Show requests"
                  value={filter}
                  onChange={setFilter}
                  tabs={[
                    { key: "ACTIVE", label: "Active" },
                    { key: "PENDING", label: "Pending" },
                    { key: "PROCESSING", label: "Processing" },
                    { key: "ALL", label: "All" },
                  ]}
                />
              </div>
            </div>
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Queue is empty"
                description="No requests match this filter right now."
              />
            ) : (
              <div className="max-h-160 divide-y divide-[#F4F5F7] dark:divide-[#262626] overflow-y-auto">
                {items.map((c) => {
                  const active = c.id === selectedId;
                  const applicant =
                    (c.resident
                      ? residentFullName(c.resident)
                      : c.manual_name) || "No name";
                  const type = certTypeLabel(c.certificate_type);
                  // REDESIGN (Nov 2026): the selected row used to be solid
                  // brand blue with the name/type line left in a dark tint
                  // (unreadable), and the status badge was hidden on it.
                  // Now the selected row is a light tint with a brand bar on
                  // the left, so every line keeps its normal readable color,
                  // the status stays visible on every row, and the applicant
                  // and document type each get their own line instead of
                  // being cut off together.
                  return (
                    <button
                      key={c.id}
                      onClick={() => setSelectedId(c.id)}
                      aria-current={active ? "true" : undefined}
                      title={`${c.queue_number} · ${applicant} · ${type}`}
                      className={`relative block w-full px-4 py-3 text-left transition ${
                        active
                          ? "bg-(--brand-tint) dark:bg-(--brand)/15"
                          : "hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]"
                      }`}
                    >
                      {active && (
                        <span
                          aria-hidden
                          className="absolute inset-y-0 left-0 w-0.75 bg-(--brand)"
                        />
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <p
                          className={`font-mono text-[13px] font-bold tabular-nums ${
                            active
                              ? "text-(--brand-fg-strong) dark:text-white"
                              : "text-[#1F2937] dark:text-white"
                          }`}
                        >
                          {c.queue_number}
                        </p>
                        <span className="shrink-0">
                          <StatusBadge status={c.status} />
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13px] font-medium text-[#1F2937] dark:text-[#E5E5E5]">
                        {applicant}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#4B5563] dark:text-[#A3A3A3]">
                        <span className="truncate">{type}</span>
                        <span
                          aria-hidden
                          className="text-[#D1D5DB] dark:text-[#525252]"
                        >
                          |
                        </span>
                        <span className="shrink-0 tabular-nums">
                          {shortDateTime(c.requested_at)}
                        </span>
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Detail panel ── */}
        <div className="lg:col-span-2">
          <div
            data-tour="page-document-queue-detail"
            className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5"
          >
            {!selected ? (
              <EmptyState
                icon={FileText}
                title="Select a request"
                description="Pick a request from the queue to review and process it."
              />
            ) : (
              <div>
                <div className="mb-5 flex items-start justify-between border-b border-[#E9EAEC] dark:border-[#262626] pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-[18px] font-semibold text-[#1F2937] dark:text-white">
                        {selected.queue_number}
                      </h2>
                      <StatusBadge status={selected.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                      Requested {formatISODateTime(selected.requested_at)} ·{" "}
                      {certTypeLabel(selected.certificate_type)}
                    </p>
                  </div>
                  <button
                    onClick={() => router.push(`/certificates/${selected.id}`)}
                    className="rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-1.5 text-[12px] font-bold text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                  >
                    Full Details
                  </button>
                </div>

                {actionError && (
                  <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-500/15 px-3 py-2.5 text-[12px] text-red-600 dark:text-red-400">
                    {actionError}
                  </div>
                )}

                <div className="mb-5 grid grid-cols-2 gap-x-6">
                  <InfoRow
                    icon={User}
                    label="Applicant"
                    value={
                      selected.resident
                        ? residentFullName(selected.resident)
                        : selected.manual_name
                    }
                  />
                  <InfoRow
                    icon={ShieldCheck}
                    label="Payment"
                    value={PAYMENT_STATUS_LABELS[selected.payment_status]}
                  />
                  <InfoRow
                    icon={FileText}
                    label="Purpose"
                    value={selected.purpose}
                  />
                  <InfoRow
                    icon={Calendar}
                    label="Requested"
                    value={formatISODateTime(selected.requested_at)}
                  />
                </div>

                {/* Payment toggle */}
                {selected.status !== "RELEASED" &&
                  selected.status !== "CANCELLED" && (
                    <div
                      data-tour="page-document-queue-payment"
                      className="mb-5 flex items-center gap-2 rounded-xl bg-[#F9FAFB] dark:bg-[#171717] border border-[#F4F5F7] dark:border-[#262626] px-4 py-3"
                    >
                      <Wallet
                        size={14}
                        className="text-[#6B7280] dark:text-[#A3A3A3]"
                      />
                      <span className="text-[12px] font-semibold text-[#374151] dark:text-[#D4D4D4]">
                        Payment Status
                      </span>
                      <div className="ml-auto flex gap-1">
                        {(["PENDING", "PAID", "WAIVED"] as const).map(
                          (ps) =>
                            can("certificates:write") && (
                              <button
                                key={ps}
                                disabled={actionBusy}
                                onClick={async () => {
                                  setActionBusy(true);
                                  try {
                                    await fetch(
                                      `/api/certificates/${selected.id}`,
                                      {
                                        method: "PATCH",
                                        headers: {
                                          "Content-Type": "application/json",
                                        },
                                        body: JSON.stringify({
                                          payment_status: ps,
                                        }),
                                      },
                                    );
                                    await load();
                                  } finally {
                                    setActionBusy(false);
                                  }
                                }}
                                className={`rounded-lg px-2.5 py-1 text-[10px] font-bold uppercase transition ${
                                  selected.payment_status === ps
                                    ? "bg-(--brand) text-white"
                                    : "bg-white dark:bg-[#171717] border border-[#E9EAEC] dark:border-[#262626] text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                                }`}
                              >
                                {PAYMENT_STATUS_LABELS[ps]}
                              </button>
                            ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Workflow actions */}
                {selected.status !== "RELEASED" &&
                  selected.status !== "CANCELLED" && (
                    <div
                      data-tour="page-document-queue-actions"
                      className="flex flex-wrap gap-2"
                    >
                      {selected.status === "PENDING" &&
                        can("certificates:write") && (
                          <button
                            disabled={actionBusy}
                            onClick={() =>
                              runAction("process", { status: "PROCESSING" })
                            }
                            className="flex items-center gap-1.5 rounded-lg bg-(--brand) px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-50"
                          >
                            <PlayCircle size={14} />
                            Start Processing
                          </button>
                        )}
                      {can("certificates:write") && (
                        <button
                          disabled={actionBusy}
                          onClick={() =>
                            runAction("process", { status: "RELEASED" })
                          }
                          className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2.5 text-[12px] font-bold text-white shadow-sm transition hover:bg-green-700 disabled:opacity-50"
                        >
                          <CheckCircle2 size={14} />
                          Mark as Released
                        </button>
                      )}
                      {can("certificates:delete") && (
                        <button
                          disabled={actionBusy}
                          onClick={() => runAction("cancel")}
                          className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-4 py-2.5 text-[12px] font-bold text-red-500 dark:text-red-400 transition hover:bg-red-50 disabled:opacity-50"
                        >
                          <XCircle size={14} />
                          Cancel Request
                        </button>
                      )}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}