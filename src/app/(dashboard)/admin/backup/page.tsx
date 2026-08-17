"use client";

import { useState, useEffect } from "react";
import { DatabaseBackup, ShieldCheck, Clock, FileArchive } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {BackupMock, formatISODateTime } from "@/lib/mock/admin";

export default function BackupPage() {
  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  //const [backups, setBackups] = useState<BackupMock[]>(MOCK_BACKUPS);
  //const [loading] = useState(false);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  const [backups, setBackups] = useState<BackupMock[]>([]);
  const [loading, setLoading] = useState(true);
  //
  useEffect(() => {
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
     loadBackups();
   }, []);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const lastBackup = backups[0] ?? null;

  // ── MOCK: trigger backup ──────────────────────────────────────────────────
  async function handleTriggerBackup() {
    setTriggering(true);
    await new Promise((r) => setTimeout(r, 700));
    const newBackup: BackupMock = {
      id: Date.now(),
      triggered_by: 6,
      trigger: { id: 6, username: "admin_root" },
      backup_date: new Date().toISOString(),
      file_reference: `backup-${Date.now()}.sql`,
    };
    setBackups((prev) => [newBackup, ...prev]);
    setTriggering(false);
    setConfirmOpen(false);

    // ── REAL WRITE (disabled until API/DB is wired up) ─────────────────
    // await fetch("/api/backup", { method: "POST" });
    // await loadBackups(); // re-fetch to sync with server state
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
        <StatCard label="Status" value="Log Only" sub="Records trigger events, not live snapshots" icon={ShieldCheck} color="amber" />
      </div>

      {/* Trigger backup */}
      <div className="mb-5 flex items-center justify-between rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-5">
        <div>
          <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Trigger Manual Backup</p>
          <p className="mt-1 max-w-lg text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
            Logs a backup event with your account and a timestamp. This does not yet perform an actual database
            snapshot — that mechanism isn&apos;t implemented server-side.
          </p>
        </div>
        <button
          onClick={() => setConfirmOpen(true)}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
        >
          <DatabaseBackup size={15} />
          Trigger Backup
        </button>
      </div>

      {/* Backup history */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)]">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
          </div>
        ) : backups.length === 0 ? (
          <EmptyState icon={DatabaseBackup} title="No backups yet" description="Trigger your first manual backup above." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] dark:border-[#333333] bg-[#F9FAFB] dark:bg-[#171717]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Date Triggered</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">Triggered By</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">File Reference</th>
              </tr>
            </thead>
            <tbody>
              {backups.map((b) => (
                <tr key={b.id} className="border-b border-[#F4F5F7] dark:border-[#262626] transition last:border-b-0 hover:bg-[#F9FAFB] dark:hover:bg-[#1F1F1F]">
                  <td className="px-4 py-3 text-[12px] font-semibold text-[#1F2937] dark:text-white">{formatISODateTime(b.backup_date)}</td>
                  <td className="px-4 py-3 text-[12px] text-[#374151] dark:text-[#D4D4D4]">{b.trigger.username}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F4F5F7] dark:bg-[#262626] px-2.5 py-1 text-[11px] font-mono text-[#6B7280] dark:text-[#A3A3A3]">
                      <FileArchive size={11} />
                      {b.file_reference ?? "—"}
                    </span>
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
        message="This will log a new backup event under your account. Proceed?"
        confirmLabel={triggering ? "Triggering..." : "Trigger Backup"}
        onConfirm={handleTriggerBackup}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}