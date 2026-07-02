"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Gavel,
  Megaphone,
  Calendar,
  Clock,
  User,
  Pencil,
  Save,
  X,
  FileText,
  Printer,
} from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import {
  MOCK_MEETINGS,
  MeetingRecordMock,
  meetingTypeLabel,
  formatISODate,
  formatISOTime,
  formatISODateTime,
  isUpcoming,
} from "@/lib/mock/meetings";

export default function MeetingDetailPage() {
  const router = useRouter();
  const params = useParams();
  const meetingId = Number(params.id);

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // In place of the real GET /api/meetings/[id] call. Swap for the
  // commented block below once the database is connected.
  const [meeting, setMeeting] = useState<MeetingRecordMock | null>(
    () => MOCK_MEETINGS.find((m) => m.id === meetingId) ?? null
  );
  const [loading] = useState(false);

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  // const [meeting, setMeeting] = useState<MeetingRecordMock | null>(null);
  // const [loading, setLoading] = useState(true);
  //
  // useEffect(() => {
  //   async function loadMeeting() {
  //     setLoading(true);
  //     try {
  //       const res = await fetch(`/api/meetings/${meetingId}`);
  //       if (!res.ok) throw new Error("Not found");
  //       setMeeting(await res.json());
  //     } catch (e) {
  //       console.error(e);
  //     } finally {
  //       setLoading(false);
  //     }
  //   }
  //   loadMeeting();
  // }, [meetingId]);

  const [editing, setEditing] = useState(false);
  const [draftMinutes, setDraftMinutes] = useState(meeting?.minutes ?? "");
  const [saving, setSaving] = useState(false);

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

  function startEdit() {
    setDraftMinutes(meeting!.minutes ?? "");
    setEditing(true);
  }

  async function handleSaveMinutes() {
    setSaving(true);

    // ── MOCK WRITE ──────────────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 400));
    setMeeting((prev) => (prev ? { ...prev, minutes: draftMinutes.trim() || null } : prev));
    setSaving(false);
    setEditing(false);

    // ── REAL WRITE (disabled until API/DB is wired up) ─────────────────
    // await fetch(`/api/meetings/${meetingId}`, {
    //   method: "PATCH",
    //   headers: { "Content-Type": "application/json" },
    //   body: JSON.stringify({ minutes: draftMinutes.trim() || null }),
    // });
    // await loadMeeting(); // re-fetch to sync with server state
  }

  const upcoming = isUpcoming(meeting.meeting_date);

  return (
    <div>
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <button
            onClick={() => router.push("/meetings")}
            className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
          >
            <ArrowLeft size={14} />
            Back to Assembly
          </button>
          <div className="flex items-center gap-3">
            <div
              className={`flex h-9 w-9 items-center justify-center rounded-xl ${
                meeting.meeting_type === "SB_MEETING" ? "bg-[#EBF3FF]" : "bg-[#D1FAE5]"
              }`}
            >
              {meeting.meeting_type === "SB_MEETING" ? (
                <Gavel size={16} className="text-[#1D4ED8]" />
              ) : (
                <Megaphone size={16} className="text-[#059669]" />
              )}
            </div>
            <h1 className="text-xl font-bold text-[#1F2937]">{meetingTypeLabel(meeting.meeting_type)}</h1>
            {upcoming && (
              <span className="rounded-full bg-[#FEF3C7] px-2.5 py-1 text-[11px] font-bold uppercase text-[#D97706]">
                Upcoming
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
            Recorded {formatISODateTime(meeting.created_at)} by {meeting.recorder.username}
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] bg-white px-4 py-2.5 text-[13px] font-bold text-[#374151] transition hover:bg-[#F4F5F7]">
          <Printer size={14} />
          Print Minutes
        </button>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* ── Left: minutes ── */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-black uppercase tracking-wide text-[#1F2937]">Minutes</p>
              {!editing ? (
                <button
                  onClick={startEdit}
                  className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7]"
                >
                  <Pencil size={12} />
                  {meeting.minutes ? "Edit" : "Add Minutes"}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7]"
                  >
                    <X size={12} />
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveMinutes}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-lg bg-[#3B82F6] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-white transition hover:bg-[#2563EB] disabled:opacity-60"
                  >
                    <Save size={12} />
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              )}
            </div>

            {editing ? (
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
    </div>
  );
}