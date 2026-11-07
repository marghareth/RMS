// FILE: src/app/(dashboard)/admin/users/page.tsx
//
// REDESIGN (Nov 2026): the three stat cards (Total / Active / Inactive)
// became filter tabs above the table, which is where those numbers are
// useful; role and status pills became plain text; and each row's two
// bordered ALL-CAPS buttons became quiet text actions. Each row now also
// says what the role can do, whether two-factor sign-in is on, and whether
// the account still has to choose its own password.
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Users, Search, Plus } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { ADMIN_TUTORIALS } from "@/lib/adminTutorials";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import UserEditSheet from "@/components/admin/UserEditSheet";
import ResetRequestsPanel from "@/components/admin/ResetRequestsPanel";
import { UserMock, roleLabel, formatISODate } from "@/lib/mock/admin";
import { readList } from "@/lib/fetch-json";
import { useCan } from "@/lib/hooks/useCan";

/** What each role can do, in a few words (src/lib/permission.ts). */
const ROLE_SCOPE: Record<string, string> = {
  ADMIN: "Full access",
  SECRETARY: "Full access",
  CAPTAIN: "Views everything, plus users and audit log",
  KAGAWAD: "View only",
  BHW: "Adds health records and vaccinations",
  ENCODER: "Adds residents, certificates and IDs",
};

type Filter = "all" | "active" | "inactive";

export default function UsersListPage() {
  const can = useCan();
  const router = useRouter();
  const { data: session } = useSession();
  const myId = (session?.user as { id?: string } | undefined)?.id;

  const [users, setUsers] = useState<UserMock[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial load: fetch directly as a promise chain rather than calling an
  // outside async function, so nothing sets state synchronously in the
  // effect body. GET /api/users returns a bare array.
  useEffect(() => {
    fetch("/api/users")
      .then((res) => readList<UserMock>(res))
      .then((data) => setUsers(data))
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, []);

  // Reusable refresh, called from event handlers (not effects) after a
  // write, so it's never subject to the set-state-in-effect rule.
  async function loadUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/users");
      setUsers(await readList<UserMock>(res));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [toggleTarget, setToggleTarget] = useState<UserMock | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState("");

  const counts = useMemo(
    () => ({
      all: users.length,
      active: users.filter((u) => u.is_active).length,
      inactive: users.filter((u) => !u.is_active).length,
    }),
    [users]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (filter === "active" && !u.is_active) return false;
      if (filter === "inactive" && u.is_active) return false;
      if (q && !`${u.username} ${roleLabel(u.role)}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [users, search, filter]);

  // Reactivating uses PATCH; deactivating uses the dedicated DELETE route,
  // which sets is_active to false server-side rather than hard-deleting.
  async function handleToggleActive() {
    if (!toggleTarget) return;
    setBusy(true);
    setActionError("");
    try {
      const res = toggleTarget.is_active
        ? await fetch(`/api/users/${toggleTarget.id}`, { method: "DELETE" })
        : await fetch(`/api/users/${toggleTarget.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ is_active: true }),
          });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setActionError(data?.message || data?.error || "Couldn't change this account. Please try again.");
      }
      await loadUsers();
    } catch (e) {
      console.error(e);
      setActionError("Couldn't change this account. Please try again.");
    } finally {
      setBusy(false);
      setToggleTarget(null);
    }
  }

  const TABS: { key: Filter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "inactive", label: "Deactivated" },
  ];

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle={
          loading && users.length === 0
            ? "Accounts that can sign in to this system"
            : `${counts.active} of ${counts.all} ${counts.all === 1 ? "account" : "accounts"} can sign in`
        }
        tutorial={ADMIN_TUTORIALS.users}
        actions={
          can("users:write") && (
            <button
              onClick={() => router.push("/admin/users/new")}
              className="flex items-center gap-2 rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-(--brand-hover)"
            >
              <Plus size={15} />
              Add user
            </button>
          )
        }
      />

      {/* "Forgot password?" requests waiting for approval (hidden when none) */}
      {can("users:write") && <ResetRequestsPanel />}

      {actionError && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[12.5px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
          {actionError}
        </p>
      )}

      <div className="overflow-hidden rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717]">
        {/* Toolbar: status tabs + search */}
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[#E9EAEC] dark:border-[#333333] px-4 pt-3">
          <div role="tablist" aria-label="Filter accounts" className="flex gap-5">
            {TABS.map((t) => {
              const active = filter === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(t.key)}
                  className={`-mb-px border-b-2 pb-2.5 text-[13px] transition ${
                    active
                      ? "border-(--brand) font-semibold text-[#1F2937] dark:text-white"
                      : "border-transparent text-[#6B7280] hover:text-[#1F2937] dark:text-[#A3A3A3] dark:hover:text-white"
                  }`}
                >
                  {t.label} <span className="ml-0.5 tabular-nums text-[#9CA3AF] dark:text-[#737373]">{counts[t.key]}</span>
                </button>
              );
            })}
          </div>
          <div className="relative mb-2.5 w-full sm:w-64">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] dark:text-[#737373]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search username or role"
              className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] py-2 pl-8 pr-3 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-(--brand-line)"
            />
          </div>
        </div>

        {loading && users.length === 0 ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} title="No users found" description="Try a different search or tab, or add a new user." />
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#F0F1F3] dark:border-[#262626]">
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Account</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Role</th>
                <th className="px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">Sign-in</th>
                <th className="hidden px-4 py-2.5 text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3] md:table-cell">Created</th>
                <th className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const isMe = myId !== undefined && String(u.id) === String(myId);
                const muted = !u.is_active;
                return (
                  <tr key={u.id} className="border-b border-[#F4F5F7] dark:border-[#262626] align-top last:border-b-0">
                    <td className="px-4 py-3">
                      <p className={`text-[13.5px] font-semibold ${muted ? "text-[#9CA3AF] dark:text-[#737373]" : "text-[#1F2937] dark:text-white"}`}>
                        {u.username}
                        {isMe && <span className="ml-2 text-[12px] font-normal text-[#6B7280] dark:text-[#A3A3A3]">(you)</span>}
                      </p>
                      {u.must_change_password && u.is_active && (
                        <p className="mt-0.5 text-[12px] text-amber-700 dark:text-amber-400">Hasn&apos;t chosen their own password yet</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className={`text-[13px] ${muted ? "text-[#9CA3AF] dark:text-[#737373]" : "text-[#1F2937] dark:text-[#E5E5E5]"}`}>{roleLabel(u.role)}</p>
                      <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{ROLE_SCOPE[u.role] ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="flex items-center gap-1.5 text-[13px]">
                        <span className={`h-1.75 w-1.75 rounded-full ${u.is_active ? "bg-green-600 dark:bg-green-500" : "bg-[#9CA3AF]"}`} />
                        <span className={u.is_active ? "text-green-700 dark:text-green-400" : "text-[#6B7280] dark:text-[#A3A3A3]"}>
                          {u.is_active ? "Active" : "Deactivated"}
                        </span>
                      </p>
                      {u.is_active && u.mfa_enabled !== undefined && (
                        <p className="mt-0.5 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
                          Two-factor {u.mfa_enabled ? "on" : "off"}
                        </p>
                      )}
                    </td>
                    <td className="hidden px-4 py-3 text-[13px] tabular-nums text-[#6B7280] dark:text-[#A3A3A3] md:table-cell">
                      {formatISODate(u.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {can("users:write") && (
                          <button
                            onClick={() => setEditId(u.id)}
                            className="rounded-md px-2.5 py-1.5 text-[13px] font-medium text-(--brand-fg) transition hover:bg-(--brand-tint)"
                          >
                            Edit
                          </button>
                        )}
                        {can("users:delete") && !isMe && (
                          <button
                            onClick={() => setToggleTarget(u)}
                            className={`rounded-md px-2.5 py-1.5 text-[13px] font-medium transition ${
                              u.is_active
                                ? "text-[#6B7280] hover:bg-red-50 hover:text-red-700 dark:text-[#A3A3A3] dark:hover:bg-red-500/10 dark:hover:text-red-400"
                                : "text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-500/10"
                            }`}
                          >
                            {u.is_active ? "Deactivate" : "Reactivate"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        open={!!toggleTarget}
        title={toggleTarget?.is_active ? "Deactivate this user?" : "Reactivate this user?"}
        message={
          toggleTarget
            ? toggleTarget.is_active
              ? `${toggleTarget.username} will no longer be able to log in. Their records are kept.`
              : `${toggleTarget.username} will regain access to log in.`
            : ""
        }
        confirmLabel={busy ? "Working..." : toggleTarget?.is_active ? "Deactivate" : "Reactivate"}
        variant={toggleTarget?.is_active ? "danger" : "success"}
        loading={busy}
        onConfirm={handleToggleActive}
        onCancel={() => setToggleTarget(null)}
      />

      <UserEditSheet
        userId={editId}
        onClose={() => setEditId(null)}
        onSaved={loadUsers}
      />
    </div>
  );
}