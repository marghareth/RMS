"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Gavel, Megaphone, FileText } from "lucide-react";
import { MeetingType } from "@/lib/mock/meetings";

export default function NewMeetingPage() {
  const router = useRouter();

  const [meetingType, setMeetingType] = useState<MeetingType>("SB_MEETING");
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

    // ── MOCK SUBMIT ─────────────────────────────────────────────────────
    await new Promise((r) => setTimeout(r, 500));
    setSubmitting(false);
    alert(
      `[MOCK] ${meetingType === "SB_MEETING" ? "SB Meeting" : "Barangay Assembly"} record created for ${meetingDate}.\nA real save will redirect to the new meeting's detail page.`
    );
    router.push("/meetings");

    
    try {
       const res = await fetch("/api/meetings", {
         method: "POST",
         headers: { "Content-Type": "application/json" },
         body: JSON.stringify({
           meeting_type: meetingType,
           meeting_date: meetingDateTime,
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
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Assembly
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">New Meeting Record</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
          Encode a SB meeting or barangay assembly, with minutes if available.
        </p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
        {/* Type toggle */}
        <div className="mb-5">
          <label className="mb-2 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
            Meeting Type
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setMeetingType("SB_MEETING")}
              className={`flex items-center justify-center gap-2 rounded-xl border-2 py-3.5 text-[13px] font-bold uppercase tracking-wide transition ${
                meetingType === "SB_MEETING"
                  ? "border-[#3B82F6] bg-[#EBF3FF] text-[#1D4ED8]"
                  : "border-[#E9EAEC] bg-white text-[#9CA3AF] hover:bg-[#F4F5F7]"
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
                  ? "border-[#059669] bg-[#D1FAE5] text-[#059669]"
                  : "border-[#E9EAEC] bg-white text-[#9CA3AF] hover:bg-[#F4F5F7]"
              }`}
            >
              <Megaphone size={16} />
              Barangay Assembly
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Meeting Date
              </label>
              <input
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Meeting Time
              </label>
              <input
                type="time"
                value={meetingTime}
                onChange={(e) => setMeetingTime(e.target.value)}
                className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] outline-none focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <FileText size={12} className="text-[#6B7280]" />
              <label className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Minutes <span className="font-normal normal-case text-[#9CA3AF]">(optional — can be added later)</span>
              </label>
            </div>
            <textarea
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              rows={10}
              placeholder="Attendance, agenda, resolutions, and other notes from the meeting..."
              className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 font-mono text-[12px] leading-relaxed outline-none focus:border-[#3B82F6]"
            />
            <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
              Minutes are stored as text. File uploads for scanned minutes arent supported by the current schema.
            </p>
          </div>

          {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/meetings")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Meeting Record"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}