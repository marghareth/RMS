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

interface PreviewRow {
  rowNumber: number;
  raw: Record<string, string>;
  data?: {
    fname: string;
    lname: string;
    birthdate: string;
  };
  errors: string[];
  isDuplicate: boolean;
}

type Step = "upload" | "preview" | "done";

export default function ResidentImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<Step>("upload");
  const [dragOver, setDragOver] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [uploading, setUploading] = useState(false);

  const [rows, setRows] = useState<PreviewRow[]>([]);
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
      // Pre-select every row that's valid with no errors and not a duplicate.
      setSelected(
        new Set(
          (data.rows as PreviewRow[])
            .filter((r) => r.data && r.errors.length === 0 && !r.isDuplicate)
            .map((r) => r.rowNumber)
        )
      );
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
      const selectedRows = rows.filter((r) => selected.has(r.rowNumber)).map((r) => r.raw);
      const res = await fetch("/api/residents/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: selectedRows }),
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

  function startOver() {
    setStep("upload");
    setRows([]);
    setSelected(new Set());
    setCommitResult(null);
    setUploadError("");
    setCommitError("");
  }

  const validCount = rows.filter((r) => r.data && r.errors.length === 0 && !r.isDuplicate).length;
  const problemCount = rows.length - validCount;

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
            {problemCount > 0 && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#FEF3C7] px-3 py-1.5 text-[12px] font-bold text-[#B45309]">
                <AlertTriangle size={13} />
                {problemCount} need attention
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
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#B45309]">
                            <AlertTriangle size={12} />
                            {r.errors[0] ?? "Needs review"}
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