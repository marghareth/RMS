// FILE PATH: src/components/layout/Topbar.tsx
// Replace the entire contents of this file with the code below.
//
// WHAT CHANGED: the notification bell previously did nothing — no
// onClick, no data, just a decorative icon with a hardcoded blue dot that
// was always "on". This wires it to the new /api/notifications endpoint
// (see api-notifications-route.ts) so it shows real, actionable alerts:
// overdue equipment returns and blotter hearings that are overdue or
// coming up soon. Clicking a notification navigates to the relevant page.
//
// Fetches once on mount and again every time the dropdown is opened, so
// it's reasonably fresh without needing polling/websockets.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, Search, Bell, LogOut, ChevronDown, AlertTriangle, Clock, Info } from "lucide-react";

// Friendly labels for the role codes stored on the User model
// (see the Role type / PERMISSIONS matrix in src/lib/permission.ts).
const ROLE_LABELS: Record<string, string> = {
  ADMIN:     "Administrator",
  CAPTAIN:   "Barangay Captain",
  SECRETARY: "Barangay Secretary",
  KAGAWAD:   "Kagawad",
  BHW:       "Barangay Health Worker",
  ENCODER:   "Encoder",
};

type Severity = "urgent" | "warning" | "info";
interface NotificationItem {
  id: string;
  severity: Severity;
  title: string;
  message: string;
  link: string;
  date: string;
}

const SEVERITY_STYLES: Record<Severity, { icon: React.ElementType; iconColor: string; dot: string }> = {
  urgent:  { icon: AlertTriangle, iconColor: "text-red-500",   dot: "bg-red-500"   },
  warning: { icon: Clock,         iconColor: "text-amber-500", dot: "bg-amber-500" },
  info:    { icon: Info,          iconColor: "text-blue-500",  dot: "bg-blue-500"  },
};

function timeAgo(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const days = Math.round(diffMs / 86400000);
  if (days === 0) return "today";
  if (days > 0) return `in ${days} day${days === 1 ? "" : "s"}`;
  return `${Math.abs(days)} day${Math.abs(days) === 1 ? "" : "s"} ago`;
}

export default function Topbar({
  onMenuClick,
  className = "",
}: {
  onMenuClick: () => void;
  className?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { data: session } = useSession();

  const username = (session?.user as any)?.username ?? "User";
  const roleCode = (session?.user as any)?.role ?? "";
  const roleLabel = ROLE_LABELS[roleCode] ?? roleCode ?? "—";
  const initial = username.charAt(0).toUpperCase();

  // ── User menu ──
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Notifications ──
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifLoading, setNotifLoading] = useState(true);
  const notifRef = useRef<HTMLDivElement>(null);

  function loadNotifications() {
    setNotifLoading(true);
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setNotifLoading(false));
  }

  useEffect(() => { loadNotifications(); }, []);

  // Close both dropdowns on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const hasUrgent  = notifications.some((n) => n.severity === "urgent");
  const hasWarning = notifications.some((n) => n.severity === "warning");
  const badgeColor = hasUrgent ? "bg-red-500" : hasWarning ? "bg-amber-500" : "bg-[#3B82F6]";

  function handleNotifClick(link: string) {
    setNotifOpen(false);
    router.push(link);
  }

  return (
    <header className={`flex h-15 shrink-0 items-center gap-4 border-b border-[#E9EAEC] bg-white px-5 sm:px-6 ${className}`}>
      <button
        type="button"
        onClick={onMenuClick}
        aria-label="Toggle sidebar"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F4F5F7] hover:text-[#1F2937]"
      >
        <Menu size={20} />
      </button>

      <div className="flex min-w-0 flex-1 items-center">
        <div className="relative w-full max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="h-10 w-full rounded-lg border border-[#E9EAEC] bg-[#F4F5F7] pl-10 pr-4 text-[13px] text-[#1F2937] transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/15"
          />
        </div>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">

        {/* Notifications */}
        <div ref={notifRef} className="relative">
          <button
            type="button"
            aria-label="Notifications"
            onClick={() => {
              setNotifOpen((v) => !v);
              if (!notifOpen) loadNotifications();
            }}
            className="relative flex h-9 w-9 items-center justify-center rounded-lg text-[#6B7280] transition-colors hover:bg-[#F4F5F7] hover:text-[#1F2937]"
          >
            <Bell size={18} />
            {notifications.length > 0 && (
              <span className={`absolute right-1.5 top-1.5 h-2 w-2 rounded-full border-2 border-white ${badgeColor}`} />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-80 overflow-hidden rounded-lg border border-[#E9EAEC] bg-white shadow-lg">
              <div className="border-b border-[#F4F5F7] px-4 py-3">
                <p className="text-[13px] font-semibold text-[#1F2937]">Notifications</p>
                <p className="text-[11px] text-[#9CA3AF]">
                  {notifications.length === 0 ? "You're all caught up" : `${notifications.length} item${notifications.length === 1 ? "" : "s"} need attention`}
                </p>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifLoading ? (
                  <p className="px-4 py-6 text-center text-[12px] text-[#9CA3AF]">Loading…</p>
                ) : notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[12px] text-[#9CA3AF]">No overdue equipment or hearings right now.</p>
                ) : (
                  notifications.map((n) => {
                    const style = SEVERITY_STYLES[n.severity];
                    const Icon = style.icon;
                    return (
                      <button
                        key={n.id}
                        onClick={() => handleNotifClick(n.link)}
                        className="flex w-full items-start gap-2.5 border-b border-[#F4F5F7] px-4 py-3 text-left transition last:border-0 hover:bg-[#F9FAFB]"
                      >
                        <Icon size={15} className={`mt-0.5 shrink-0 ${style.iconColor}`} />
                        <div className="min-w-0">
                          <p className="text-[12px] font-semibold text-[#1F2937]">{n.title}</p>
                          <p className="mt-0.5 text-[11px] leading-snug text-[#6B7280]">{n.message}</p>
                          <p className="mt-1 text-[10px] font-medium text-[#9CA3AF]">{timeAgo(n.date)}</p>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mx-1 hidden h-6 w-px bg-[#E9EAEC] sm:block" />

        {/* User menu */}
        <div ref={menuRef} className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 transition-colors hover:bg-[#F4F5F7]"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1F2937] text-[11px] font-bold text-white">
              {initial}
            </div>
            <div className="hidden text-left sm:block">
              <p className="text-[13px] font-semibold leading-tight text-[#1F2937]">
                {username}
              </p>
              <p className="text-[11px] text-[#9CA3AF]">{roleLabel}</p>
            </div>
            <ChevronDown size={14} className="hidden text-[#9CA3AF] sm:block" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-30 mt-2 w-56 overflow-hidden rounded-lg border border-[#E9EAEC] bg-white shadow-lg">
              <div className="border-b border-[#F4F5F7] px-4 py-3">
                <p className="text-[13px] font-semibold text-[#1F2937]">{username}</p>
                <p className="text-[11px] text-[#9CA3AF]">{roleLabel}</p>
              </div>
              <button
                type="button"
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-[13px] font-medium text-red-600 transition hover:bg-red-50"
              >
                <LogOut size={15} />
                Log out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}