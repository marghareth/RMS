// src/components/meetings/MeetingDetailSheet.tsx
//
// The meeting detail view — inline meeting/minutes editing, agenda items —
// as a slide-over instead of a full page navigation. Content mirrors
// (dashboard)/meetings/[id]/page.tsx (which still exists for direct
// links/bookmarks and printing), just re-homed so it can render inside
// <Sheet> and be driven by a `meetingId` prop from the meetings list page.
//
// NOTE on printing: "Print Minutes" intentionally stays a real page action
// (via the "open full page" ↗ button) rather than calling window.print()
// from inside this sheet. There's no print stylesheet in this app that
// hides the dimmed backdrop / dashboard chrome behind an open sheet, so
// printing from inside an overlay would risk pulling in content that
// shouldn't be on the page. The full page's own Print button is unaffected.
//
// NOTE on nesting: AgendaItemSheet is a <Sheet> too, so opening it from
// here nests one dialog inside another. That's supported natively by the
// underlying @base-ui/react Dialog (stacked portals), so it's kept as-is
// rather than flattened into this component.
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Gavel, Megaphone, Calendar, Clock, User, MapPin, Pencil, Save, X,
  FileText, ExternalLink, Plus, Trash2, ListChecks,
} from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import AgendaItemSheet from "@/components/meetings/AgendaItemSheet";
import {
  MeetingRecordMock,
  AgendaItemMock,
  MeetingType,
  MeetingStatus,
  meetingTypeLabel,
  formatISODate,
  formatISOTime,
  formatISODateTime,
  isUpcoming,
  MEETING_STATUSES,
} from "@/lib/mock/meetings";

interface MeetingDetailSheetProps {
  /** The meeting to show, or null to keep the sheet closed. */
  meetingId: number | null;
  onClose: () => void;
  /** Called whenever the meeting is edited, in case the list needs a refetch. */
  onUpdated?: () => void;
}

export default function MeetingDetailSheet({ meetingId, onClose, onUpdated }: MeetingDetailSheetProps) {
  const router = useRouter();
  const open = meetingId !== null;

  const [meeting, setMeeting] = useState<MeetingRecordMock | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Minutes inline edit ──────────────────────────────────────────────
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState("");
  const [savingMinutes, setSavingMinutes] = useState(false);

  // ── Meeting details inline edit ──────────────────────────────────────
  const [editingMeeting, setEditingMeeting] = useState(false);
  const [draft, setDraft] = useState({
    title: "",
    location: "",
    meeting_type: "SB_MEETING" as MeetingType,
    status: "SCHEDULED" as MeetingStatus,
    meeting_date: "",
    meeting_time: "",
  });
  const [savingMeeting, setSavingMeeting] = useState(false);
  const [meetingError, setMeetingError] = useState("");

  // ── Agenda items ──────────────────────────────────────────────────────
  const [agendaSheetOpen, setAgendaSheetOpen] = useState(false);
  const [agendaSheetItem, setAgendaSheetItem] = useState<AgendaItemMock | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AgendaItemMock | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Whenever `meetingId` changes (a new meeting opened in this same sheet
  // instance), reset synchronously during render — including any
  // in-progress inline edits — so the fetch effect below never needs to
  // call setState at the top of its body.
  const [syncedId, setSyncedId] = useState<number | null>(null);
  if (meetingId !== null && meetingId !== syncedId) {
    setSyncedId(meetingId);
    setMeeting(null);
    setLoading(true);
    setEditingMeeting(false);
    setEditingMinutes(false);
  } else if (meetingId === null && syncedId !== null) {
    setSyncedId(null);
  }

  const loadMeeting = useCallback(async () => {
    if (meetingId === null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`);
      if (!res.ok) throw new Error("Not found");
      setMeeting(await res.json());
    } catch (e) {
      console.error(e);
      setMeeting(null);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    if (meetingId === null) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMeeting();
  }, [meetingId, loadMeeting]);

  const agendaItems = useMemo(
    () => [...(meeting?.agenda_items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [meeting]
  );
  const filledCount = agendaItems.filter((a) => a.status !== "PENDING").length;

  function startEditMinutes() {
    setDraftMinutes(meeting?.minutes ?? "");
    setEditingMinutes(true);
  }

  async function handleSaveMinutes() {
    if (meetingId === null) return;
    setSavingMinutes(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: draftMinutes.trim() || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      await loadMeeting();
      onUpdated?.();
      setEditingMinutes(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMinutes(false);
    }
  }

  function startEditMeeting() {
    if (!meeting) return;
    const d = new Date(meeting.meeting_date);
    setDraft({
      title: meeting.title ?? "",
      location: meeting.location ?? "",
      meeting_type: meeting.meeting_type,
      status: meeting.status,
      meeting_date: d.toISOString().slice(0, 10),
      meeting_time: d.toISOString().slice(11, 16),
    });
    setMeetingError("");
    setEditingMeeting(true);
  }

  async function handleSaveMeeting() {
    if (meetingId === null) return;
    setMeetingError("");
    if (!draft.meeting_date) {
      setMeetingError("Please select the meeting date.");
      return;
    }
    setSavingMeeting(true);
    try {
      const meetingDateTime = new Date(`${draft.meeting_date}T${draft.meeting_time || "00:00"}:00`).toISOString();
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: draft.title.trim() || null,
          location: draft.location.trim() || null,
          meeting_type: draft.meeting_type,
          status: draft.status,
          meeting_date: meetingDateTime,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      await loadMeeting();
      onUpdated?.();
      setEditingMeeting(false);
    } catch (e) {
      console.error(e);
      setMeetingError("Something went wrong while saving. Please try again.");
    } finally {
      setSavingMeeting(false);
    }
  }

  function openAddAgendaItem() {
    setAgendaSheetItem(null);
    setAgendaSheetOpen(true);
  }

  function openEditAgendaItem(item: AgendaItemMock) {
    setAgendaSheetItem(item);
    setAgendaSheetOpen(true);
  }

  async function handleAgendaSaved() {
    setAgendaSheetOpen(false);
    await loadMeeting();
    onUpdated?.();
  }

  async function handleDeleteAgendaItem() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agenda-items/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadMeeting();
      onUpdated?.();
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  const upcoming = meeting ? isUpcoming(meeting.meeting_date) : false;

  return (
    <>
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="p-0">
        {loading || !meeting ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Meeting record not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Meeting record not found"
                  description="This meeting record doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="min-w-0">
                {!editingMeeting ? (
                  <>
                    <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#9CA3AF] dark:text-[#A3A3A3]">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {formatISODate(meeting.meeting_date)}
                      </span>
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                          meeting.meeting_type === "SB_MEETING" ? "bg-[#EBF3FF] dark:bg-blue-500/15 text-[#1D4ED8] dark:text-[#93C5FD]" : "bg-[#D1FAE5] dark:bg-emerald-500/15 text-[#059669] dark:text-[#34D399]"
                        }`}
                      >
                        {meeting.meeting_type === "SB_MEETING" ? <Gavel size={10} /> : <Megaphone size={10} />}
                        {meetingTypeLabel(meeting.meeting_type)}
                      </span>
                      <StatusBadge status={meeting.status} />
                      {upcoming && meeting.status === "SCHEDULED" && (
                        <span className="rounded-full bg-[#FEF3C7] dark:bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase text-[#D97706] dark:text-[#FBBF24]">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <SheetTitle className="mt-1 truncate">
                      {meeting.title || meetingTypeLabel(meeting.meeting_type)}
                    </SheetTitle>
                    <p className="mt-0.5 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                      Recorded {formatISODateTime(meeting.created_at)} by {meeting.recorder.username}
                    </p>
                  </>
                ) : (
                  <SheetTitle>Editing Meeting Details</SheetTitle>
                )}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {!editingMeeting && (
                  <>
                    <button
                      onClick={startEditMeeting}
                      className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-3 py-1.5 text-[12px] font-bold text-[#374151] dark:text-[#D4D4D4] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      onClick={openAddAgendaItem}
                      className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
                    >
                      <Plus size={13} />
                      Add Item
                    </button>
                  </>
                )}
                <button
                  onClick={() => router.push(`/meetings/${meeting.id}`)}
                  title="Open full page (also where to print minutes)"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody className="space-y-4">
              {/* Edit Meeting inline form */}
              {editingMeeting && (
                <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Title
                      </label>
                      <input
                        value={draft.title}
                        onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Meeting Type
                      </label>
                      <select
                        value={draft.meeting_type}
                        onChange={(e) => setDraft((d) => ({ ...d, meeting_type: e.target.value as MeetingType }))}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      >
                        <option value="SB_MEETING">SB Meeting</option>
                        <option value="BARANGAY_ASSEMBLY">Barangay Assembly</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Status
                      </label>
                      <select
                        value={draft.status}
                        onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as MeetingStatus }))}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      >
                        {MEETING_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Meeting Date
                      </label>
                      <input
                        type="date"
                        value={draft.meeting_date}
                        onChange={(e) => setDraft((d) => ({ ...d, meeting_date: e.target.value }))}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Meeting Time
                      </label>
                      <input
                        type="time"
                        value={draft.meeting_time}
                        onChange={(e) => setDraft((d) => ({ ...d, meeting_time: e.target.value }))}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                        Location
                      </label>
                      <input
                        value={draft.location}
                        onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      />
                    </div>
                  </div>

                  {meetingError && (
                    <p className="mt-3 rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{meetingError}</p>
                  )}

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      onClick={() => setEditingMeeting(false)}
                      className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                    >
                      <X size={12} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveMeeting}
                      disabled={savingMeeting}
                      className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
                    >
                      <Save size={12} />
                      {savingMeeting ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>
              )}

              {/* Agenda Items */}
              <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks size={15} className="text-[#6B7280] dark:text-[#A3A3A3]" />
                    <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Agenda Items</p>
                  </div>
                  <span className="rounded-full bg-[#F4F5F7] dark:bg-[#262626] px-2.5 py-1 text-[11px] font-bold text-[#6B7280] dark:text-[#A3A3A3]">
                    {filledCount}/{agendaItems.length} filled
                  </span>
                </div>

                {agendaItems.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="mb-3 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">No agenda items yet.</p>
                    <button
                      onClick={openAddAgendaItem}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
                    >
                      <Plus size={12} />
                      Add First Item
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="border-b border-[#F4F5F7] dark:border-[#262626] text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">
                          <th className="w-10 py-2">#</th>
                          <th className="py-2">Title</th>
                          <th className="w-32 py-2">Status</th>
                          <th className="w-20 py-2 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {agendaItems.map((item, idx) => (
                          <tr key={item.id} className="border-b border-[#F4F5F7] dark:border-[#262626] last:border-b-0">
                            <td className="py-3 text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">{idx + 1}</td>
                            <td className="py-3">
                              <p className="text-[13px] font-semibold text-[#1F2937] dark:text-white">{item.title}</p>
                              {item.description && (
                                <p className="mt-0.5 line-clamp-1 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{item.description}</p>
                              )}
                            </td>
                            <td className="py-3">
                              <StatusBadge status={item.status} />
                            </td>
                            <td className="py-3">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => openEditAgendaItem(item)}
                                  title="Edit"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => setDeleteTarget(item)}
                                  title="Delete"
                                  className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#FEE2E2] dark:hover:bg-red-500/20 hover:text-[#DC2626] dark:hover:text-[#F87171]"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                {/* ── Minutes ── */}
                <div className="lg:col-span-2">
                  <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Minutes</p>
                      {!editingMinutes ? (
                        <button
                          onClick={startEditMinutes}
                          className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                        >
                          <Pencil size={12} />
                          {meeting.minutes ? "Edit" : "Add Minutes"}
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setEditingMinutes(false)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
                          >
                            <X size={12} />
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveMinutes}
                            disabled={savingMinutes}
                            className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
                          >
                            <Save size={12} />
                            {savingMinutes ? "Saving..." : "Save"}
                          </button>
                        </div>
                      )}
                    </div>

                    {editingMinutes ? (
                      <textarea
                        value={draftMinutes}
                        onChange={(e) => setDraftMinutes(e.target.value)}
                        rows={14}
                        autoFocus
                        placeholder="Attendance, agenda, resolutions, and other notes from the meeting..."
                        className="w-full resize-none rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 font-mono text-[12px] leading-relaxed outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
                      />
                    ) : meeting.minutes ? (
                      <p className="whitespace-pre-line font-mono text-[12px] leading-relaxed text-[#374151] dark:text-[#D4D4D4]">
                        {meeting.minutes}
                      </p>
                    ) : (
                      <p className="py-8 text-center text-[12px] text-[#9CA3AF] dark:text-[#A3A3A3]">
                        No minutes encoded yet. Click &quot;Add Minutes&quot; once the meeting has taken place.
                      </p>
                    )}
                  </div>
                </div>

                {/* ── Meeting info ── */}
                <div className="lg:col-span-1">
                  <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-4">
                    <p className="mb-3 text-[12px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Meeting Info</p>
                    <div className="space-y-3">
                      <div className="flex items-start gap-2.5">
                        <Calendar size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Date</p>
                          <p className="text-[13px] text-[#1F2937] dark:text-white">{formatISODate(meeting.meeting_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <Clock size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Time</p>
                          <p className="text-[13px] text-[#1F2937] dark:text-white">{formatISOTime(meeting.meeting_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <MapPin size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Location</p>
                          <p className="text-[13px] text-[#1F2937] dark:text-white">{meeting.location || "—"}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2.5">
                        <User size={14} className="mt-0.5 shrink-0 text-[#9CA3AF] dark:text-[#A3A3A3]" />
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF] dark:text-[#A3A3A3]">Recorded By</p>
                          <p className="text-[13px] text-[#1F2937] dark:text-white">{meeting.recorder.username}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </SheetBody>

            <AgendaItemSheet
              open={agendaSheetOpen}
              meetingId={meeting.id}
              item={agendaSheetItem}
              onClose={() => setAgendaSheetOpen(false)}
              onSaved={handleAgendaSaved}
            />
          </div>
        )}
      </SheetContent>
    </Sheet>

    <ConfirmDialog
      open={deleteTarget !== null}
      title="Delete Agenda Item"
      message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
      confirmLabel="Delete"
      variant="danger"
      loading={deleting}
      onConfirm={handleDeleteAgendaItem}
      onCancel={() => setDeleteTarget(null)}
    />
    </>
  );
}