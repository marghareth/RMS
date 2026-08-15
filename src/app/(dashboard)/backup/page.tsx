// FILE: src/app/(dashboard)/admin/backup/page.tsx
"use client";

import { useState, useEffect } from "react";
import { DatabaseBackup, ShieldCheck, Clock, FileArchive, Download, AlertTriangle } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { formatISODateTime } from "@/lib/mock/admin";

interface BackupRecord {
  id: number;
  triggered_by: number;
  trigger: { id: number; username: string };
  backup_date: string;
  file_reference: string | null;
}

export default function BackupPage() {
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadBackups() {
    setLoading(true);
    try {
      const res = await fetch("/api/backup");
      setBackups(await res.json()); // GET /api/backup returns a bare array
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadBackups();
  }, []);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [error, setError] = useState("");

  const lastBackup = backups[0] ?? null;

  async function handleTriggerBackup() {
    setTriggering(true);
    setError("");
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Backup failed. Check that pg_dump is installed on the server.");
        return;
      }
      setConfirmOpen(false);
      await loadBackups(); // re-fetch so the list reflects real server state, including file size
    } catch (e) {
      console.error(e);
      setError("Backup failed. Check that pg_dump is installed on the server.");
    } finally {
      setTriggering(false);
    }
  }

  return (
    <div>
      <PageHeader title="Backup" subtitle="Manual backup trigger and backup history" />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Backups" value={backups.length} sub="All-time records" icon={DatabaseBackup} color="blue" />
        <StatCard
          label="Last Backup"
          value={lastBackup ? formatISODateTime(lastBackup.backup_date) : "None yet"}
          sub={lastBackup ? `By ${lastBackup.trigger.username}` : "No backups triggered"}
          icon={Clock}
          color="green"
        />
        <StatCard label="Status" value="Live Snapshots" sub="Each entry is a real, restorable pg_dump file" icon={ShieldCheck} color="amber" />
      </div>

      {/* Trigger backup */}
      <div className="mb-5 flex items-center justify-between rounded-xl border border-[#E9EAEC] bg-white p-5">
        <div>
          <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Trigger Manual Backup</p>
          <p className="mt-1 max-w-lg text-[12px] text-[#9CA3AF]">
            Runs a real database dump (pg_dump) and saves it to the server. Download it from the table below —
            it can be restored with <code className="font-mono">psql</code> if needed.
          </p>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
        >
          <DatabaseBackup size={15} />
          Trigger Backup
        </button>
      </div>

      {error && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-[#FCA5A5] bg-[#FEF2F2] px-4 py-3 text-[12px] text-[#B91C1C]">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {/* Backup history */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
          </div>
        ) : backups.length === 0 ? (
          <EmptyState icon={DatabaseBackup} title="No backups yet" description="Trigger your first manual backup above." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Date Triggered</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Triggered By</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">File Reference</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]"></th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-b border-[#F4F5F7] transition last:border-b-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#1F2937]">{formatISODateTime(b.backup_date)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151]">{b.trigger.username}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F5F7] px-2.5 py-1 text-[11px] font-mono text-[#6B7280]">
                      <FileArchive size={11} />
                      {b.file_reference ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {b.file_reference && (
                      <a
                        href={`/api/backup/${b.id}/download`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#3B82F6] hover:text-[#2563EB]"
                      >
                        <Download size={12} />
                        Download
                      </a>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Trigger a manual backup?"
        message="This will run a full database dump now. It may take a moment on a large database. Proceed?"
        confirmLabel={triggering ? "Running..." : "Trigger Backup"}
        onConfirm={handleTriggerBackup}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}