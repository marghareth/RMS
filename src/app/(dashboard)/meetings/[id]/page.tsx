"use client";
// FILE: src/app/(dashboard)/meetings/[id]/page.tsx

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Gavel,
  Megaphone,
  Calendar,
  Clock,
  User,
  MapPin,
  Pencil,
  Save,
  X,
  FileText,
  Printer,
  Plus,
  Trash2,
  ListChecks,
  Sparkles,
  Loader2,
  Copy,
} from "lucide-react";
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

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const meetingId = Number(params.id);

  const [meeting, setMeeting] = useState<MeetingRecordMock | null>(null);
  const [loading, setLoading] = useState(true);

  const loadMeeting = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`);
      if (!res.ok) throw new Error("Not found");
      setMeeting(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [meetingId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMeeting();
  }, [loadMeeting]);

  // ── Duplicate meeting ─────────────────────────────────────────────────
  // Lightweight alternative to full recurrence rules: clone this meeting's
  // type/title/location/agenda structure onto a new date instead of
  // rebuilding the same weekly agenda from scratch each time.
  const [duplicateOpen, setDuplicateOpen] = useState(false);
  const [duplicateDate, setDuplicateDate] = useState("");
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateError, setDuplicateError] = useState("");

  async function handleDuplicate() {
    if (!duplicateDate) return;
    setDuplicating(true);
    setDuplicateError("");
    try {
      const res = await fetch(`/api/meetings/${meetingId}/duplicate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meeting_date: duplicateDate }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDuplicateError(data.message || "Couldn't duplicate this meeting.");
        return;
      }
      router.push(`/meetings/${data.id}`);
    } catch (e) {
      console.error(e);
      setDuplicateError("Couldn't duplicate this meeting.");
    } finally {
      setDuplicating(false);
    }
  }

  // ── Minutes inline edit ──────────────────────────────────────────────
  const [editingMinutes, setEditingMinutes] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState("");
  const [savingMinutes, setSavingMinutes] = useState(false);

  // ── AI minutes draft ───────────────────────────────────────────────────
  // Staff jots raw notes during/after the meeting; AI turns them into a
  // properly formatted draft grounded in this meeting's actual agenda
  // items (fetched server-side, not trusted from the client). Still just
  // fills the same draftMinutes textarea above — nothing saves until the
  // existing Save button is clicked, so staff always reviews before it's
  // committed.
  const [aiNotesOpen, setAiNotesOpen] = useState(false);
  const [aiRawNotes, setAiRawNotes] = useState("");
  const [aiDrafting, setAiDrafting] = useState(false);
  const [aiMinutesError, setAiMinutesError] = useState("");

  async function handleAiDraftMinutes() {
    if (!aiRawNotes.trim()) return;
    setAiDrafting(true);
    setAiMinutesError("");
    try {
      const res = await fetch(`/api/ai/meeting-minutes/${meetingId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: aiRawNotes.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiMinutesError(data.message || "Couldn't generate a draft. You can still write the minutes manually.");
        return;
      }
      setDraftMinutes(data.minutes);
      setAiNotesOpen(false);
      setAiRawNotes("");
    } catch (e) {
      console.error(e);
      setAiMinutesError("Couldn't generate a draft. You can still write the minutes manually.");
    } finally {
      setAiDrafting(false);
    }
  }

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

  const agendaItems = useMemo(
    () => [...(meeting?.agenda_items ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [meeting]
  );
  const filledCount = agendaItems.filter((a) => a.status !== "PENDING").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
      </div>
    );
  }

  if (!meeting) {
    return (
      <EmptyState
        icon={FileText}
        title="Meeting record not found"
        description="This meeting record doesn't exist or may have been removed."
        action={
          <button
            onClick={() => router.push("/meetings")}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
          >
            Back to Assembly
          </button>
        }
      />
    );
  }

  function startEditMinutes() {
    setDraftMinutes(meeting!.minutes ?? "");
    setEditingMinutes(true);
    setAiNotesOpen(false);
    setAiRawNotes("");
    setAiMinutesError("");
  }

  async function handleSaveMinutes() {
    setSavingMinutes(true);
    try {
      const res = await fetch(`/api/meetings/${meetingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes: draftMinutes.trim() || null }),
      });
      if (!res.ok) throw new Error("Save failed");
      await loadMeeting();
      setEditingMinutes(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMinutes(false);
    }
  }

  function startEditMeeting() {
    const d = new Date(meeting!.meeting_date);
    setDraft({
      title: meeting!.title ?? "",
      location: meeting!.location ?? "",
      meeting_type: meeting!.meeting_type,
      status: meeting!.status,
      meeting_date: d.toISOString().slice(0, 10),
      meeting_time: d.toISOString().slice(11, 16),
    });
    setMeetingError("");
    setEditingMeeting(true);
  }

  async function handleSaveMeeting() {
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
  }

  async function handleDeleteAgendaItem() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/agenda-items/${deleteTarget.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      await loadMeeting();
      setDeleteTarget(null);
    } catch (e) {
      console.error(e);
    } finally {
      setDeleting(false);
    }
  }

  const upcoming = isUpcoming(meeting.meeting_date);

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <button
            onClick={() => router.push("/meetings")}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
          >
            <ArrowLeft size={14} />
            Back to Assembly
          </button>

          {!editingMeeting ? (
            <>
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#9CA3AF]">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {formatISODate(meeting.meeting_date)}
                </span>
                <span
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                    meeting.meeting_type === "SB_MEETING" ? "bg-[#EBF3FF] text-[#1D4ED8]" : "bg-[#D1FAE5] text-[#059669]"
                  }`}
                >
                  {meeting.meeting_type === "SB_MEETING" ? <Gavel size={10} /> : <Megaphone size={10} />}
                  {meetingTypeLabel(meeting.meeting_type)}
                </span>
                <StatusBadge status={meeting.status} />
                {upcoming && meeting.status === "SCHEDULED" && (
                  <span className="rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-bold uppercase text-[#D97706]">
                    Upcoming
                  </span>
                )}
                {meeting.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} />
                    {meeting.location}
                  </span>
                )}
              </div>
              <h1 className="mt-1 truncate text-xl font-bold text-[#1F2937]">
                {meeting.title || meetingTypeLabel(meeting.meeting_type)}
              </h1>
              <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
                Recorded {formatISODateTime(meeting.created_at)} by {meeting.recorder.username}
              </p>
            </>
          ) : (
            <p className="mt-1 text-[15px] font-bold text-[#1F2937]">Editing Meeting Details</p>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2 print:hidden">
          {!editingMeeting ? (
            <>
              <button
                onClick={startEditMeeting}
                className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
              >
                <Pencil size={14} />
                Edit Meeting
              </button>
              <button
                onClick={openAddAgendaItem}
                className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
              >
                <Plus size={14} />
                Add Item
              </button>
              <button
                onClick={() => setDuplicateOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
                title="Duplicate this meeting onto a new date"
              >
                <Copy size={14} />
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]"
                title="Print Minutes"
              >
                <Printer size={14} />
              </button>
            </>
          ) : null}
        </div>
      </div>

      {duplicateOpen && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] px-4 py-3 print:hidden">
          <Copy size={14} className="text-[#6B7280]" />
          <p className="text-[12px] text-[#374151]">
            Duplicate this meeting&apos;s agenda ({meeting.agenda_items?.length ?? 0} item
            {meeting.agenda_items?.length === 1 ? "" : "s"}) onto:
          </p>
          <input
            type="date"
            value={duplicateDate}
            onChange={(e) => setDuplicateDate(e.target.value)}
            className="rounded-lg border border-[#E9EAEC] px-2.5 py-1.5 text-[12px] outline-none focus:border-[#3B82F6]"
          />
          <button
            onClick={handleDuplicate}
            disabled={duplicating || !duplicateDate}
            className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] disabled:opacity-60"
          >
            {duplicating ? <Loader2 size={12} className="animate-spin" /> : <Copy size={12} />}
            Create Duplicate
          </button>
          <button
            onClick={() => setDuplicateOpen(false)}
            className="text-[11px] font-semibold text-[#6B7280] hover:text-[#374151]"
          >
            Cancel
          </button>
          {duplicateError && <span className="text-[11px] text-[#DC2626]">{duplicateError}</span>}
        </div>
      )}

      {/* Edit Meeting inline form */}
      {editingMeeting && (
        <div className="mb-5 rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Title
              </label>
              <input
                value={draft.title}
                onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Meeting Type
              </label>
              <select
                value={draft.meeting_type}
                onChange={(e) => setDraft((d) => ({ ...d, meeting_type: e.target.value as MeetingType }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              >
                <option value="SB_MEETING">SB Meeting</option>
                <option value="BARANGAY_ASSEMBLY">Barangay Assembly</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Status
              </label>
              <select
                value={draft.status}
                onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value as MeetingStatus }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              >
                {MEETING_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Meeting Date
              </label>
              <input
                type="date"
                value={draft.meeting_date}
                onChange={(e) => setDraft((d) => ({ ...d, meeting_date: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Meeting Time
              </label>
              <input
                type="time"
                value={draft.meeting_time}
                onChange={(e) => setDraft((d) => ({ ...d, meeting_time: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Location
              </label>
              <input
                value={draft.location}
                onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          {meetingError && (
            <p className="mt-3 rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{meetingError}</p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              onClick={() => setEditingMeeting(false)}
              className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7]"
            >
              <X size={12} />
              Cancel
            </button>
            <button
              onClick={handleSaveMeeting}
              disabled={savingMeeting}
              className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] disabled:opacity-60"
            >
              <Save size={12} />
              {savingMeeting ? "Saving..." : "Save"}
            </button>
          </div>
        </div>
      )}

      {/* Agenda Items */}
      <div className="mb-5 rounded-xl border border-[#E9EAEC] bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ListChecks size={15} className="text-[#6B7280]" />
            <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Agenda Items</p>
          </div>
          <span className="rounded-full bg-[#F4F5F7] px-2.5 py-1 text-[11px] font-bold text-[#6B7280]">
            {filledCount}/{agendaItems.length} filled
          </span>
        </div>

        {agendaItems.length === 0 ? (
          <div className="py-8 text-center">
            <p className="mb-3 text-[12px] text-[#9CA3AF]">No agenda items yet.</p>
            <button
              onClick={openAddAgendaItem}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
            >
              <Plus size={12} />
              Add First Item
            </button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#F4F5F7] text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">
                <th className="w-10 py-2">#</th>
                <th className="py-2">Title</th>
                <th className="w-32 py-2">Status</th>
                <th className="w-20 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {agendaItems.map((item, idx) => (
                <tr key={item.id} className="border-b border-[#F4F5F7] last:border-b-0">
                  <td className="py-3 text-[12px] text-[#9CA3AF]">{idx + 1}</td>
                  <td className="py-3">
                    <p className="text-[13px] font-semibold text-[#1F2937]">{item.title}</p>
                    {item.description && (
                      <p className="mt-0.5 line-clamp-1 text-[11px] text-[#9CA3AF]">{item.description}</p>
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
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937]"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        title="Delete"
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#9CA3AF] transition hover:bg-[#FEE2E2] hover:text-[#DC2626]"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Left: minutes ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Minutes</p>
              {!editingMinutes ? (
                <button
                  onClick={startEditMinutes}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7]"
                >
                  <Pencil size={12} />
                  {meeting.minutes ? "Edit" : "Add Minutes"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setAiNotesOpen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9D5FF] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#7C3AED] transition hover:bg-[#FAF5FF]"
                  >
                    <Sparkles size={12} />
                    Draft with AI
                  </button>
                  <button
                    onClick={() => {
                      setEditingMinutes(false);
                      setAiNotesOpen(false);
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7]"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMinutes}
                    disabled={savingMinutes}
                    className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] disabled:opacity-60"
                  >
                    <Save size={12} />
                    {savingMinutes ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            {editingMinutes && aiNotesOpen && (
              <div className="mb-3 rounded-lg border border-[#E9D5FF] bg-[#FAF5FF] p-3">
                <p className="mb-2 text-[11px] text-[#6D28D9]">
                  Paste or type your raw notes from the meeting — attendance, what was discussed, any
                  resolutions. AI will draft formatted minutes from this and this meeting&apos;s agenda items.
                </p>
                <textarea
                  value={aiRawNotes}
                  onChange={(e) => setAiRawNotes(e.target.value)}
                  rows={5}
                  autoFocus
                  placeholder="e.g. All kagawads present except Cruz. Discussed the drainage complaint from Purok 3, agreed to schedule an inspection next week..."
                  className="w-full resize-none rounded-lg border border-[#E9D5FF] bg-white px-3 py-2 text-[12px] outline-none focus:border-[#7C3AED]"
                />
                <div className="mt-2 flex items-center justify-end gap-2">
                  {aiMinutesError && <p className="mr-auto text-[11px] text-[#DC2626]">{aiMinutesError}</p>}
                  <button
                    onClick={handleAiDraftMinutes}
                    disabled={aiDrafting || !aiRawNotes.trim()}
                    className="flex items-center gap-1.5 rounded-lg bg-[#7C3AED] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#6D28D9] disabled:opacity-60"
                  >
                    {aiDrafting ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                    {aiDrafting ? "Drafting..." : "Generate Draft"}
                  </button>
                </div>
              </div>
            )}

            {editingMinutes ? (
              <textarea
                value={draftMinutes}
                onChange={(e) => setDraftMinutes(e.target.value)}
                rows={16}
                autoFocus
                placeholder="Attendance, agenda, resolutions, and other notes from the meeting..."
                className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 font-mono text-[12px] leading-relaxed outline-none focus:border-[#3B82F6]"
              />
            ) : meeting.minutes ? (
              <p className="whitespace-pre-line font-mono text-[12px] leading-relaxed text-[#374151]">
                {meeting.minutes}
              </p>
            ) : (
              <p className="py-8 text-center text-[12px] text-[#9CA3AF]">
                No minutes encoded yet. Click &quot;Add Minutes&quot; once the meeting has taken place.
              </p>
            )}
          </div>
        </div>

        {/* ── Right: meeting info ── */}
        <div className="lg:col-span-1">
          <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
            <p className="mb-3 text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Meeting Info</p>
            <div className="space-y-3">
              <div className="flex items-start gap-2.5">
                <Calendar size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Date</p>
                  <p className="text-[13px] text-[#1F2937]">{formatISODate(meeting.meeting_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <Clock size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Time</p>
                  <p className="text-[13px] text-[#1F2937]">{formatISOTime(meeting.meeting_date)}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <MapPin size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Location</p>
                  <p className="text-[13px] text-[#1F2937]">{meeting.location || "—"}</p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <User size={14} className="mt-0.5 shrink-0 text-[#9CA3AF]" />
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-[#9CA3AF]">Recorded By</p>
                  <p className="text-[13px] text-[#1F2937]">{meeting.recorder.username}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AgendaItemSheet
        open={agendaSheetOpen}
        meetingId={meetingId}
        item={agendaSheetItem}
        onClose={() => setAgendaSheetOpen(false)}
        onSaved={handleAgendaSaved}
      />

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
    </div>
  );
}