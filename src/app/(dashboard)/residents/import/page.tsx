// FILE: src/app/(dashboard)/residents/import/page.tsx
"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Users,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { describeMatch, type DuplicateMatchInfo } from "@/lib/duplicate-detection";
import {
  buildErrorReportCsv,
  buildSummaryCsv,
  IMPORT_ERROR_TYPES,
  IMPORT_ERROR_TYPE_LABELS,
  type ImportIssue,
  type ImportSummary,
} from "@/lib/importMetrics";
import { RESIDENT_IMPORT_COLUMNS } from "@/lib/residentImportColumns";

interface PreviewRow {
  rowNumber: number;
  raw: Record<string, string>;
  data?: {
    fname: string;
    lname: string;
    birthdate: string;
  };
  errors: string[];
  /** Exact duplicate — cannot be imported. */
  isDuplicate: boolean;
  /** Resembles an existing resident / earlier row — importable once the user confirms. */
  possibleDuplicates?: DuplicateMatchInfo[];
  /** Structured problems (field + error type) behind `errors`. */
  issues?: ImportIssue[];
}

/** Saves text as a UTF-8 CSV (with BOM, so Excel shows accented names correctly). */
function downloadCsv(filename: string, csv: string) {
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// A row with no errors and not an exact duplicate, but that looks like
// someone already on file. Not pre-selected; ticking it = the user's
// explicit confirmation that it is a different person.
const needsReview = (r: PreviewRow) =>
  !!r.data && r.errors.length === 0 && !r.isDuplicate && (r.possibleDuplicates?.length ?? 0) > 0;

// Clean row: safe to import without a second look.
const isReady = (r: PreviewRow) =>
  !!r.data && r.errors.length === 0 && !r.isDuplicate && !needsReview(r);

type Step = "upload" | "preview" | "done";

export default function ResidentImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [rows, setRows] = useState<PreviewRow[]>([]);
  // Server-computed data-quality metrics for the uploaded file (definitions: src/lib/importMetrics.ts).
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [fileName, setFileName] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<{ created: number; skipped: { rowNumber: number; reason: string }[] } | null>(null);
  const [commitError, setCommitError] = useState("");

  async function handleFile(file: File) {
    setUploadError("");
    if (!/\.(csv|xlsx?)$/i.test(file.name)) {
      setUploadError("Only .csv and .xlsx files are supported.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/residents/import/preview", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        setUploadError(data.message || "Couldn't process this file.");
        return;
      }
      setRows(data.rows);
      setSummary(data.summary);
      setFileName(file.name);
      // Pre-select only clean rows. Possible duplicates stay unticked until
      // the user decides they really are different people.
      setSelected(new Set((data.rows as PreviewRow[]).filter(isReady).map((r) => r.rowNumber)));
      setStep("preview");
    } catch (e) {
      console.error(e);
      setUploadError("Couldn't process this file.");
    } finally {
      setUploading(false);
    }
  }

  function toggleRow(rowNumber: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(rowNumber)) next.delete(rowNumber);
      else next.add(rowNumber);
      return next;
    });
  }

  async function handleCommit() {
    setCommitting(true);
    setCommitError("");
    try {
      const selectedPreviewRows = rows.filter((r) => selected.has(r.rowNumber));
      // Positions (within the submitted list) of ticked rows that carry a
      // possible-duplicate warning — the server only imports those when told
      // the user confirmed them.
      const confirmedRows = selectedPreviewRows.flatMap((r, i) => (needsReview(r) ? [i] : []));
      const res = await fetch("/api/residents/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: selectedPreviewRows.map((r) => r.raw), confirmed_rows: confirmedRows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommitError(data.message || "Import failed.");
        return;
      }
      setCommitResult(data);
      setStep("done");
    } catch (e) {
      console.error(e);
      setCommitError("Import failed.");
    } finally {
      setCommitting(false);
    }
  }

  const reportBase = () =>
    `${(fileName.replace(/\.[^.]+$/, "") || "import").replace(/[^\w.-]+/g, "_")}_${new Date().toISOString().slice(0, 10)}`;

  function downloadErrorReport() {
    downloadCsv(
      `error-report_${reportBase()}.csv`,
      buildErrorReportCsv(rows, RESIDENT_IMPORT_COLUMNS.map((c) => c.key))
    );
  }

  function downloadSummary() {
    if (!summary) return;
    downloadCsv(`import-summary_${reportBase()}.csv`, buildSummaryCsv(summary, { fileName }));
  }

  function startOver() {
    setStep("upload");
    setRows([]);
    setSummary(null);
    setFileName("");
    setSelected(new Set());
    setCommitResult(null);
    setUploadError("");
    setCommitError("");
  }

  const validCount = rows.filter(isReady).length;
  const reviewCount = rows.filter(needsReview).length;
  const problemCount = rows.length - validCount - reviewCount;

  return (
    <div>
      <PageHeader
        title="Import Residents"
        subtitle="Bulk-add residents from a CSV or Excel spreadsheet"
        actions={
          <button
            onClick={() => router.push("/residents")}
            className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] bg-white px-3 py-2 text-[12px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
          >
            <ArrowLeft size={13} />
            Back to Residents
          </button>
        }
      />

      {step === "upload" && (
        <div className="mx-auto max-w-xl">
          <div className="mb-4 flex items-center justify-between rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] px-4 py-3">
            <p className="text-[12px] text-[#6B7280]">
              Not sure what columns to use? Start from the template.
            </p>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- this points to an API download route, not a Next.js page */}
            <a
              href="/api/residents/import/template"
              className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold text-[#3B82F6] hover:text-[#2563EB]"
            >
              <Download size={12} />
              Download Template
            </a>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-8 py-14 text-center transition ${
              dragOver ? "border-[#3B82F6] bg-[#EFF6FF]" : "border-[#E9EAEC] bg-white hover:bg-[#F9FAFB]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            {uploading ? (
              <>
                <Loader2 size={32} className="animate-spin text-[#3B82F6]" />
                <p className="text-[13px] font-semibold text-[#374151]">Processing file...</p>
              </>
            ) : (
              <>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#EFF6FF]">
                  <Upload size={20} className="text-[#3B82F6]" />
                </div>
                <div>
                  <p className="text-[13px] font-bold text-[#1F2937]">Drop your file here, or click to browse</p>
                  <p className="mt-1 text-[11px] text-[#9CA3AF]">.csv, .xlsx, or .xls — up to 500 rows</p>
                </div>
              </>
            )}
          </div>

          {uploadError && (
            <div className="mt-4 flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#B91C1C]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {uploadError}
            </div>
          )}
        </div>
      )}

      {step === "preview" && (
        <div>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 rounded-full bg-[#DCFCE7] px-3 py-1.5 text-[12px] font-bold text-[#15803D]">
              <CheckCircle2 size={13} />
              {validCount} ready to import
            </div>
            {reviewCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-[12px] font-bold text-[#B45309]">
                <AlertTriangle size={13} />
                {reviewCount} possible duplicate{reviewCount === 1 ? "" : "s"} — review
              </div>
            )}
            {problemCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#FEE2E2] px-3 py-1.5 text-[12px] font-bold text-[#B91C1C]">
                <AlertTriangle size={13} />
                {problemCount} can&apos;t be imported
              </div>
            )}
            <span className="text-[12px] text-[#9CA3AF]">{selected.size} selected</span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={startOver}
                className="rounded-lg border border-[#E9EAEC] bg-white px-3 py-2 text-[12px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
              >
                Start Over
              </button>
              <button
                onClick={handleCommit}
                disabled={committing || selected.size === 0}
                className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB] disabled:opacity-60"
              >
                {committing ? <Loader2 size={13} className="animate-spin" /> : <Users size={13} />}
                Import {selected.size} Resident{selected.size === 1 ? "" : "s"}
              </button>
            </div>
          </div>

          {summary && (
            <div className="mb-4 rounded-xl border border-[#E9EAEC] bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-[#6B7280]">
                    Data entry error rate
                  </p>
                  <p className="text-[28px] font-black leading-tight text-[#1F2937]">{summary.errorRate}%</p>
                  <p className="text-[11px] text-[#6B7280]">
                    {summary.errors} of {summary.total} row{summary.total === 1 ? "" : "s"} could not be entered
                    automatically ({summary.invalid} invalid + {summary.duplicates} duplicate).
                    {summary.possibleDuplicates > 0 &&
                      ` ${summary.possibleDuplicates} more need a duplicate check (${summary.possibleDuplicateRate}%, not counted as errors).`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={downloadErrorReport}
                    disabled={summary.errors + summary.possibleDuplicates === 0}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] bg-white px-3 py-2 text-[12px] font-bold text-[#374151] transition hover:bg-[#F4F5F7] disabled:cursor-not-allowed disabled:opacity-50"
                    title="Every row that needs attention, with what's wrong and the original values — fix it and re-upload"
                  >
                    <Download size={13} />
                    Error report (CSV)
                  </button>
                  <button
                    onClick={downloadSummary}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] bg-white px-3 py-2 text-[12px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
                    title="Counts, rates and breakdown by error type and field"
                  >
                    <Download size={13} />
                    Summary (CSV)
                  </button>
                </div>
              </div>

              {summary.errors > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[#F3F4F6] pt-3">
                  {IMPORT_ERROR_TYPES.filter((t) => summary.errorsByType[t] > 0).map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-[#FEE2E2] px-2.5 py-1 text-[11px] font-semibold text-[#B91C1C]"
                    >
                      {IMPORT_ERROR_TYPE_LABELS[t]}: {summary.errorsByType[t]}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {commitError && (
            <div className="mb-4 flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#B91C1C]">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              {commitError}
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                  <th className="w-10 px-4 py-3" />
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Row</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Name</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Birthdate</th>
                  <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const hasIssue = r.errors.length > 0 || r.isDuplicate;
                  const review = needsReview(r);
                  const first = r.possibleDuplicates?.[0];
                  const more = (r.possibleDuplicates?.length ?? 0) - 1;
                  return (
                    <tr key={r.rowNumber} className="border-b border-[#F4F5F7] last:border-b-0">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(r.rowNumber)}
                          onChange={() => toggleRow(r.rowNumber)}
                          className="h-3.5 w-3.5 rounded border-[#D1D5DB]"
                        />
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6B7280]">{r.rowNumber}</td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-[#1F2937]">
                        {r.data ? `${r.data.lname}, ${r.data.fname}` : r.raw.lname || r.raw.fname || "—"}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-[#6B7280]">
                        {r.data?.birthdate ?? r.raw.birthdate ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {hasIssue ? (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#B91C1C]">
                            <AlertTriangle size={12} />
                            {r.errors[0] ?? "Needs review"}
                          </div>
                        ) : review && first ? (
                          <div className="text-[11px] font-semibold text-[#B45309]">
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle size={12} />
                              Possible duplicate — {first.label.toLowerCase()}
                            </div>
                            <div className="mt-0.5 pl-4.5 font-normal text-[#92400E]">
                              Looks like {describeMatch(first)}
                              {more > 0 ? ` (+${more} more)` : ""}. Tick the box to import anyway.
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#15803D]">
                            <CheckCircle2 size={12} />
                            Ready
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {step === "done" && commitResult && (
        <div className="mx-auto max-w-lg text-center">
          <div className="mb-4 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DCFCE7]">
              <CheckCircle2 size={26} className="text-[#16A34A]" />
            </div>
          </div>
          <h2 className="text-[16px] font-bold text-[#1F2937]">
            Imported {commitResult.created} resident{commitResult.created === 1 ? "" : "s"}
          </h2>
          {commitResult.skipped.length > 0 && (
            <div className="mt-4 rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] p-4 text-left">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                {commitResult.skipped.length} row{commitResult.skipped.length === 1 ? "" : "s"} skipped
              </p>
              <ul className="space-y-1">
                {commitResult.skipped.map((s) => (
                  <li key={s.rowNumber} className="text-[12px] text-[#6B7280]">
                    Row {s.rowNumber}: {s.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-6 flex items-center justify-center gap-2">
            <button
              onClick={startOver}
              className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[12px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
            >
              <FileSpreadsheet size={13} />
              Import Another File
            </button>
            <button
              onClick={() => router.push("/residents")}
              className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
            >
              <Users size={13} />
              View Residents
            </button>
          </div>
        </div>
      )}
    </div>
  );
}