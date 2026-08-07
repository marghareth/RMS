// FILE: src/app/(dashboard)/document-release/page.tsx
//
// Document Release — the released side of the Document Request Workflow.
// Same underlying /api/certificates data as Document Queue, filtered to
// status=RELEASED, and labeled with "Control #" rather than "Queue #" since
// these documents have already been handed to the applicant.
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Search, Printer, ChevronRight, FileText } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import {
  CertificateMock, certTypeLabel, residentFullName, formatISODate, formatISODateTime,
  PAYMENT_STATUS_LABELS,
} from "@/lib/mock/certificates";

export default function DocumentReleasePage() {
  const router = useRouter();

  const [items, setItems] = useState<CertificateMock[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "100", status: "RELEASED" });
      if (search) params.set("search", search);
      if (dateFrom) params.set("released_from", dateFrom);
      if (dateTo) params.set("released_to", dateTo);
      const res = await fetch(`/api/certificates?${params}`);
      const data = await res.json();
      setItems(data.certificates ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load]);

  const today = items.filter(
    (c) => c.issued_at && new Date(c.issued_at).toDateString() === new Date().toDateString()
  ).length;
  const unpaidReleased = items.filter((c) => c.payment_status === "PENDING").length;

  return (
    <div>
      <PageHeader
        title="Document Release"
        subtitle="Records of certificates and documents already released to applicants"
      />

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Released Today" value={today} sub="Handed out today" icon={CheckCircle2} color="green" />
        <StatCard label="Total Released" value={items.length} sub="Matching current filters" icon={FileText} color="blue" />
        <StatCard label="Unpaid on Release" value={unpaidReleased} sub="Released without full payment" icon={CheckCircle2} color="amber" />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-50">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search control #, name…"
            className="w-full rounded-xl border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="rounded-xl border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#3B82F6]"
        />
        <span className="text-[12px] text-[#9CA3AF]">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="rounded-xl border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#3B82F6]"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="No released documents found" description="Try adjusting your search or date range." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Control #</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Applicant</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Payment</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Released</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => router.push(`/certificates/${c.id}`)}
                  className="cursor-pointer border-b border-[#F4F5F7] transition last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937]">{c.certificate_no}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-[#EBF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                      {certTypeLabel(c.certificate_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">
                    {c.resident ? residentFullName(c.resident) : c.manual_name}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        c.payment_status === "PAID"
                          ? "bg-green-50 text-green-600"
                          : c.payment_status === "WAIVED"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-amber-50 text-amber-600"
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[c.payment_status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#6B7280]" title={c.issued_at ? formatISODateTime(c.issued_at) ?? "" : ""}>
                    {c.issued_at ? formatISODate(c.issued_at) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/certificates/${c.id}/preview`);
                        }}
                        className="rounded-lg border border-[#E9EAEC] p-1.5 text-[#6B7280] transition hover:bg-[#F4F5F7]"
                        title="Print"
                      >
                        <Printer size={13} />
                      </button>
                      <ChevronRight size={15} className="text-[#D1D5DB]" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}