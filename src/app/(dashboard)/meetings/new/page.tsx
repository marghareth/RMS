"use client";
// FILE: src/app/(dashboard)/meetings/new/page.tsx

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gavel, Megaphone, FileText } from "lucide-react";
import { MeetingType } from "@/lib/mock/meetings";

export default function NewMeetingPage() {
  const router = useRouter();

  const [meetingType, setMeetingType] = useState<MeetingType>("SB_MEETING");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [meetingDate, setMeetingDate] = useState(new Date().toISOString().slice(0, 10));
  const [meetingTime, setMeetingTime] = useState("14:00");
  const [minutes, setMinutes] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError("");
    if (!meetingDate) {
      setError("Please select the meeting date.");
      return;
    }

    setSubmitting(true);
    const meetingDateTime = new Date(`${meetingDate}T${meetingTime || "00:00"}:00`).toISOString();

    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meeting_type: meetingType,
          meeting_date: meetingDateTime,
          title: title.trim() || undefined,
          location: location.trim() || undefined,
          minutes: minutes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create meeting record");
      const created = await res.json();
      router.push(`/meetings/${created.id}`);
    } catch (e) {
      console.error(e);
      setError("Something went wrong while saving. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/meetings")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Assembly
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">New Meeting Record</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">
          Encode a SB meeting or barangay assembly. Agenda items can be added once the meeting is created.
        </p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
        {/* Type toggle */}
        <div className="mb-5">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
            Meeting Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMeetingType("SB_MEETING")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[13px] font-bold uppercase tracking-wide transition ${
                meetingType === "SB_MEETING"
                  ? "border-[#3B82F6] dark:border-[#60A5FA] bg-[#EBF3FF] dark:bg-blue-500/15 text-[#1D4ED8] dark:text-[#93C5FD]"
                  : "border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#9CA3AF] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
              }`}
            >
              <Gavel size={16} />
              SB Meeting
            </button>
            <button
              type="button"
              onClick={() => setMeetingType("BARANGAY_ASSEMBLY")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[13px] font-bold uppercase tracking-wide transition ${
                meetingType === "BARANGAY_ASSEMBLY"
                  ? "border-[#059669] dark:border-[#34D399] bg-[#D1FAE5] dark:bg-emerald-500/15 text-[#059669] dark:text-[#34D399]"
                  : "border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] text-[#9CA3AF] dark:text-[#A3A3A3] hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F]"
              }`}
            >
              <Megaphone size={16} />
              Barangay Assembly
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
              Title <span className="font-normal normal-case text-[#9CA3AF] dark:text-[#A3A3A3]">(optional)</span>
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Q3 Budget Review & Infrastructure Update"
              className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Meeting Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Meeting Time
              </label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
              Location <span className="font-normal normal-case text-[#9CA3AF] dark:text-[#A3A3A3]">(optional)</span>
            </label>
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Barangay Hall Session Room"
              className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
            />
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <FileText size={12} className="text-[#6B7280] dark:text-[#A3A3A3]" />
              <label className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
                Minutes <span className="font-normal normal-case text-[#9CA3AF] dark:text-[#A3A3A3]">(optional — can be added later)</span>
              </label>
            </div>
            <textarea
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              rows={8}
              placeholder="Attendance, agenda, resolutions, and other notes from the meeting..."
              className="w-full resize-none rounded-lg border border-[#E9EAEC] dark:border-[#262626] px-3 py-2.5 font-mono text-[12px] leading-relaxed outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
            />
            <p className="mt-1.5 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">
              Minutes are stored as text. For structured, trackable topics, use Agenda Items on the meeting page instead.
            </p>
          </div>

          {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/meetings")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Meeting Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}