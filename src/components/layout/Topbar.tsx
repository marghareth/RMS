// FILE PATH: src/components/layout/Topbar.tsx
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
//
// SEARCH FIX: the search box was purely decorative — `onChange` only set
// local state, nothing ever called `/api/search` (which was already
// built correctly server-side and permission-checked per role, just
// never wired to any UI). Typing a name did nothing because no request
// was ever made. Fixed by debouncing the query and fetching
// `/api/search?q=...`, rendering a grouped results dropdown (residents /
// certificates / blotter cases, matching the endpoint's response shape),
// and navigating to the relevant detail page on click — same
// ref/outside-click-to-close pattern already used for the notifications
// dropdown below.

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, Search, Bell, LogOut, ChevronDown, AlertTriangle, Clock, Info, FileText, ScrollText, User as UserIcon } from "lucide-react";

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

// ── Search ── shape matches the response of GET /api/search exactly.
interface ResidentHit {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  purok: { id: number; name: string } | null;
}
interface CertificateHit {
  id: number;
  certificate_no: string;
  certificate_type: string;
  manual_name: string | null;
  resident: { fname: string; lname: string } | null;
}
interface BlotterHit {
  id: number;
  case_number: string;
  complainant_name: string;
  respondent_name: string;
  status: string;
}
interface SearchResults {
  residents: ResidentHit[];
  certificates: CertificateHit[];
  blotter: BlotterHit[];
}
const EMPTY_RESULTS: SearchResults = { residents: [], certificates: [], blotter: [] };

function residentName(r: { fname: string; lname: string; mname?: string | null }) {
  return [r.fname, r.mname, r.lname].filter(Boolean).join(" ");
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

  // ── Search ──
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS);
  const searchRef = useRef<HTMLDivElement>(null);

  // NOTE: this only kicks off a fetch — any setState calls happen inside
  // the .then/.catch/.finally callbacks (async, post-effect), never
  // synchronously in the effect body itself, so it's safe to call from
  // useEffect below without tripping react-hooks/set-state-in-effect.
  function loadNotifications() {
    fetch("/api/notifications")
      .then((r) => (r.ok ? r.json() : { notifications: [] }))
      .then((d) => setNotifications(d.notifications ?? []))
      .catch(() => setNotifications([]))
      .finally(() => setNotifLoading(false));
  }

  // notifLoading already starts as `true` (see useState above), so no
  // setState is needed here on mount — just kick off the fetch.
  useEffect(() => { loadNotifications(); }, []);

  // Debounced live search — fires ~300ms after typing stops, matching the
  // API's own "q.length < 2" short-circuit so we don't bother querying
  // for a single character. AbortController cancels any in-flight
  // request if the user keeps typing, so a slow earlier response can't
  // overwrite a newer one.
  //
  // All setState calls here happen inside the setTimeout callback, never
  // synchronously in the effect body itself (react-hooks/set-state-in-effect)
  // — the "loading" flag is set eagerly from the onChange handler instead,
  // since that's a real event handler rather than an effect.
  useEffect(() => {
    const q = search.trim();
    const controller = new AbortController();

    const timer = setTimeout(() => {
      if (q.length < 2) {
        setResults(EMPTY_RESULTS);
        setSearchLoading(false);
        return;
      }
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : EMPTY_RESULTS))
        .then((d) => setResults({ ...EMPTY_RESULTS, ...d }))
        .catch((err) => {
          if (err.name !== "AbortError") setResults(EMPTY_RESULTS);
        })
        .finally(() => setSearchLoading(false));
    }, q.length < 2 ? 0 : 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [search]);

  const hasResults =
    results.residents.length > 0 || results.certificates.length > 0 || results.blotter.length > 0;

  function goTo(link: string) {
    setSearchOpen(false);
    setSearch("");
    router.push(link);
  }

  // Close all three dropdowns on outside click.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setSearchOpen(false);
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
        <div ref={searchRef} className="relative w-full max-w-md">
          <Search
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
          />
          <input
            value={search}
            onChange={(e) => {
              const value = e.target.value;
              setSearch(value);
              setSearchOpen(true);
              setSearchLoading(value.trim().length >= 2);
            }}
            onFocus={() => setSearchOpen(true)}
            placeholder="Search..."
            className="h-10 w-full rounded-lg border border-[#E9EAEC] bg-[#F4F5F7] pl-10 pr-4 text-[13px] text-[#1F2937] transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/15"
          />

          {searchOpen && search.trim().length >= 2 && (
            <div className="absolute left-0 top-full z-30 mt-2 w-full min-w-[20rem] overflow-hidden rounded-lg border border-[#E9EAEC] bg-white shadow-lg">
              <div className="max-h-96 overflow-y-auto">
                {searchLoading ? (
                  <p className="px-4 py-6 text-center text-[12px] text-[#9CA3AF]">Searching…</p>
                ) : !hasResults ? (
                  <p className="px-4 py-6 text-center text-[12px] text-[#9CA3AF]">No matches for {`"${search.trim()}"`}.</p>
                ) : (
                  <>
                    {results.residents.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Residents</p>
                        {results.residents.map((r) => (
                          <button
                            key={`resident-${r.id}`}
                            onClick={() => goTo(`/residents/${r.id}`)}
                            className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition hover:bg-[#F9FAFB]"
                          >
                            <UserIcon size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-[#1F2937]">{residentName(r)}</p>
                              {r.purok && <p className="text-[11px] text-[#9CA3AF]">{r.purok.name}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {results.certificates.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Certificates</p>
                        {results.certificates.map((c) => (
                          <button
                            key={`certificate-${c.id}`}
                            onClick={() => goTo(`/certificates/${c.id}`)}
                            className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition hover:bg-[#F9FAFB]"
                          >
                            <FileText size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-[#1F2937]">
                                {c.resident ? residentName(c.resident) : c.manual_name ?? "Unknown"}
                              </p>
                              <p className="text-[11px] text-[#9CA3AF]">{c.certificate_no}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {results.blotter.length > 0 && (
                      <div>
                        <p className="px-4 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Blotter Cases</p>
                        {results.blotter.map((b) => (
                          <button
                            key={`blotter-${b.id}`}
                            onClick={() => goTo(`/blotter/${b.id}`)}
                            className="flex w-full items-start gap-2.5 px-4 py-2 text-left transition hover:bg-[#F9FAFB]"
                          >
                            <ScrollText size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
                            <div className="min-w-0">
                              <p className="truncate text-[12px] font-semibold text-[#1F2937]">
                                {b.complainant_name} vs {b.respondent_name}
                              </p>
                              <p className="text-[11px] text-[#9CA3AF]">{b.case_number}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
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
              if (!notifOpen) {
                setNotifLoading(true);
                loadNotifications();
              }
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