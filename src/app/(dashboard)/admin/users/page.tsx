"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, UserCheck, UserX, Search, Plus, Pencil, Power } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { MOCK_USERS, UserMock, roleLabel, formatISODate } from "@/lib/mock/admin";

export default function UsersListPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  const [users, setUsers] = useState<UserMock[]>(MOCK_USERS);
  const [loading] = useState(false);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [users, setUsers] = useState<UserMock[]>([]);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   async function loadUsers() {
  //     setLoading(true);
  //     try {
  //       const res = await fetch("/api/users");
  //       setUsers(await res.json()); // GET /api/users returns a bare array
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadUsers();
  // }, []);

  const [search, setSearch] = useState("");
  const [deactivateTarget, setDeactivateTarget] = useState<UserMock | null>(null);
  const [busy, setBusy] = useState(false);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (search.trim()) {
        const q = search.toLowerCase();
        if (!`${u.username} ${roleLabel(u.role)}`.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [users, search]);

  const stats = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
    }),
    [users]
  );

  // ── MOCK: toggle active status (soft-delete uses the same mechanism) ────
  async function handleToggleActive() {
    if (!deactivateTarget) return;
    setBusy(true);
    await new Promise((r) => setTimeout(r, 300));
    setUsers((prev) =>
      prev.map((u) => (u.id === deactivateTarget.id ? { ...u, is_active: !u.is_active } : u))
    );
    setBusy(false);
    setDeactivateTarget(null);

    // ── REAL WRITE (disabled until API/DB is wired up) ─────────────────
    // Reactivating uses PATCH; deactivating uses the dedicated DELETE route,
    // which sets is_active to false server-side rather than hard-deleting.
    // if (deactivateTarget.is_active) {
    //   await fetch(`/api/users/${deactivateTarget.id}`, { method: "DELETE" });
    // } else {
    //   await fetch(`/api/users/${deactivateTarget.id}`, {
    //     method: "PATCH",
    //     headers: { "Content-Type": "application/json" },
    //     body: JSON.stringify({ is_active: true }),
    //   });
    // }
    // await loadUsers();
  }

  return (
    <div>
      <PageHeader
        title="User Management"
        subtitle="Accounts with access to this system"
        actions={
          <button
            onClick={() => router.push("/admin/users/new")}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Plus size={15} />
            Add User
          </button>
        }
      />

      {/* Stat cards */}
      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Users" value={stats.total} sub="All accounts" icon={Users} color="blue" />
        <StatCard label="Active" value={stats.active} sub="Can log in" icon={UserCheck} color="green" />
        <StatCard label="Inactive" value={stats.inactive} sub="Access disabled" icon={UserX} color="red" />
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search username or role"
          className="w-full rounded-xl border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
        />
      </div>

      {/* Users table */}
      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try adjusting your search, or add a new user." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#E9EAEC] bg-[#F9FAFB]">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Username</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Role</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-[#6B7280]">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id} className="border-b border-[#F4F5F7] transition last:border-b-0 hover:bg-[#F9FAFB]">
                  <td className="px-4 py-3 text-[12px] font-bold text-[#1F2937]">{u.username}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center rounded-full bg-[#EBF3FF] px-2.5 py-1 text-[11px] font-semibold text-[#1D4ED8]">
                      {roleLabel(u.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        u.is_active ? "bg-[#D1FAE5] text-[#059669]" : "bg-[#F4F5F7] text-[#9CA3AF]"
                      }`}
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-[#9CA3AF]">{formatISODate(u.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => router.push(`/admin/users/${u.id}/edit`)}
                        className="flex w-20 items-center justify-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#374151] transition hover:bg-[#F4F5F7]"
                      >
                        <Pencil size={11} />
                        Edit
                      </button>
                      <button
                        onClick={() => setDeactivateTarget(u)}
                        className={`flex w-30.5 items-center justify-center gap-1.5 rounded-lg border px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide transition ${
                          u.is_active
                            ? "border-[#FEE2E2] text-[#DC2626] hover:bg-[#FEE2E2]"
                            : "border-[#D1FAE5] text-[#059669] hover:bg-[#D1FAE5]"
                        }`}
                      >
                        <Power size={11} />
                        {u.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!deactivateTarget}
        title={deactivateTarget?.is_active ? "Deactivate this user?" : "Reactivate this user?"}
        message={
          deactivateTarget
            ? deactivateTarget.is_active
              ? `${deactivateTarget.username} will no longer be able to log in. Their records are kept.`
              : `${deactivateTarget.username} will regain access to log in.`
            : ""
        }
        confirmLabel={busy ? "Working..." : deactivateTarget?.is_active ? "Deactivate" : "Activate"}
        danger={deactivateTarget?.is_active}
        onConfirm={handleToggleActive}
        onCancel={() => setDeactivateTarget(null)}
      />
    </div>
  );
}