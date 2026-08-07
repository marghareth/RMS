// FILE: src/app/(dashboard)/calendar/page.tsx
"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft, ChevronRight, Plus, CalendarDays,
  Pencil, Trash2, Link2,
} from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";

// ─── Types ──────────────────────────────────────────────────────────────────
interface CalendarEventItem {
  id: number;
  title: string;
  description: string | null;
  event_date: string; // ISO
  event_type: string | null;
  meeting_id: number | null;
  meeting: { id: number; title: string | null; meeting_type: string } | null;
  creator: { id: number; username: string };
  created_at: string;
  updated_at: string;
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EVENT_TYPE_PRESETS = ["Meeting", "Holiday", "Deadline", "Assembly", "Announcement"];

const EVENT_TYPE_STYLES: Record<string, string> = {
  Meeting: "bg-blue-50 text-blue-600",
  Holiday: "bg-green-50 text-green-600",
  Deadline: "bg-red-50 text-red-600",
  Assembly: "bg-purple-50 text-purple-600",
  Announcement: "bg-amber-50 text-amber-600",
};

function EventTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const style = EVENT_TYPE_STYLES[type] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${style}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {type}
    </span>
  );
}

// ─── Date helpers ───────────────────────────────────────────────────────────
// All dates are handled as UTC-midnight "day" values — event_date is coerced
// from a plain <input type="date"> value (no meaningful time-of-day), so
// working in UTC everywhere avoids the calendar grid silently shifting a day
// depending on the viewer's local timezone.
function utcDate(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m, d));
}
function dateKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}
function addMonths(d: Date, delta: number) {
  return utcDate(d.getUTCFullYear(), d.getUTCMonth() + delta, 1);
}
function addDays(d: Date, delta: number) {
  return new Date(d.getTime() + delta * 24 * 60 * 60 * 1000);
}
function today() {
  const now = new Date();
  return utcDate(now.getFullYear(), now.getMonth(), now.getDate());
}
function formatMonthLabel(d: Date) {
  return d.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
function formatFullLabel(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });
}

export default function CalendarPage() {
  const [viewDate, setViewDate] = useState(() => utcDate(today().getUTCFullYear(), today().getUTCMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<Date>(() => today());

  const [events, setEvents] = useState<CalendarEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // 6-week grid (42 cells) covering the visible month, padded with the
  // trailing days of the previous/next month.
  const gridDays = useMemo(() => {
    const monthStart = utcDate(viewDate.getUTCFullYear(), viewDate.getUTCMonth(), 1);
    const gridStart = addDays(monthStart, -monthStart.getUTCDay());
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  }, [viewDate]);

  const gridStart = gridDays[0];
  const gridEnd = gridDays[gridDays.length - 1];

  // Fetch is the actual "synchronize with an external system" work, so it
  // stays in an effect — written as a plain .then() chain (not a call to a
  // named async function) so every setState happens inside a callback,
  // never synchronously in the effect body, per react-hooks/set-state-in-effect.
  useEffect(() => {
    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        setLoading(true);
        setLoadError("");
      }
    });

    const params = new URLSearchParams({
      date_from: dateKey(gridStart),
      date_to: dateKey(gridEnd),
    });

    fetch(`/api/calendar-events?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load calendar events");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setEvents(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (!cancelled) setLoadError("Couldn't load events. Please refresh and try again.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [gridStart, gridEnd]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const ev of events) {
      const key = dateKey(new Date(ev.event_date));
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const selectedKey = dateKey(selectedDate);
  const selectedDayEvents = eventsByDay.get(selectedKey) ?? [];
  const todayKey = dateKey(today());
  const currentMonth = viewDate.getUTCMonth();

  // ── Add / Edit sheet ────────────────────────────────────────────────────
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEventItem | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [eventTypeSelect, setEventTypeSelect] = useState("");
  const [eventTypeOther, setEventTypeOther] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function openAddSheet(prefillDate?: Date) {
    setEditingEvent(null);
    setTitle("");
    setDescription("");
    setEventDate(dateKey(prefillDate ?? selectedDate));
    setEventTypeSelect("");
    setEventTypeOther("");
    setFormError("");
    setSheetOpen(true);
  }

  function openEditSheet(ev: CalendarEventItem) {
    setEditingEvent(ev);
    setTitle(ev.title);
    setDescription(ev.description ?? "");
    setEventDate(dateKey(new Date(ev.event_date)));
    if (ev.event_type && EVENT_TYPE_PRESETS.includes(ev.event_type)) {
      setEventTypeSelect(ev.event_type);
      setEventTypeOther("");
    } else if (ev.event_type) {
      setEventTypeSelect("Other");
      setEventTypeOther(ev.event_type);
    } else {
      setEventTypeSelect("");
      setEventTypeOther("");
    }
    setFormError("");
    setSheetOpen(true);
  }

  async function refetchEvents() {
    const params = new URLSearchParams({ date_from: dateKey(gridStart), date_to: dateKey(gridEnd) });
    const res = await fetch(`/api/calendar-events?${params.toString()}`);
    if (res.ok) setEvents(await res.json());
  }

  async function handleSubmit() {
    if (!title.trim()) {
      setFormError("Please provide an event title.");
      return;
    }
    if (!eventDate) {
      setFormError("Please select a date.");
      return;
    }
    if (eventTypeSelect === "Other" && !eventTypeOther.trim()) {
      setFormError("Please specify the event type.");
      return;
    }

    setSubmitting(true);
    setFormError("");

    const finalEventType =
      eventTypeSelect === "Other" ? eventTypeOther.trim() : eventTypeSelect || null;

    try {
      const res = await fetch(
        editingEvent ? `/api/calendar-events/${editingEvent.id}` : "/api/calendar-events",
        {
          method: editingEvent ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim() || null,
            event_date: `${eventDate}T00:00:00.000Z`,
            event_type: finalEventType,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to manage calendar events.");
        throw new Error(data.message || data.error || `Failed to save event (${res.status}).`);
      }
      setSheetOpen(false);
      setSelectedDate(utcDate(
        parseInt(eventDate.slice(0, 4)),
        parseInt(eventDate.slice(5, 7)) - 1,
        parseInt(eventDate.slice(8, 10))
      ));
      await refetchEvents();
    } catch (e: any) {
      setFormError(e.message || "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<CalendarEventItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/calendar-events/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) throw new Error("Your session has expired. Please log in again.");
        if (res.status === 403) throw new Error("You don't have permission to delete calendar events.");
        throw new Error(data.message || data.error || `Failed to delete event (${res.status}).`);
      }
      setDeleteTarget(null);
      await refetchEvents();
    } catch (e: any) {
      setDeleteError(e.message || "Something went wrong.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Barangay events, meetings, and important dates"
        actions={
          <button
            onClick={() => openAddSheet()}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
          >
            <Plus size={15} />
            Add Event
          </button>
        }
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1fr_340px]">
        {/* ── Month grid ── */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-[15px] font-bold text-[#1F2937]">{formatMonthLabel(viewDate)}</p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => { const t = today(); setViewDate(utcDate(t.getUTCFullYear(), t.getUTCMonth(), 1)); setSelectedDate(t); }}
                className="rounded-lg px-3 py-1.5 text-[11px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7]"
              >
                Today
              </button>
              <button
                onClick={() => setViewDate((d) => addMonths(d, -1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F4F5F7]"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={() => setViewDate((d) => addMonths(d, 1))}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F4F5F7]"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          {loadError && (
            <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-600">
              {loadError}
            </div>
          )}

          {/* Weekday header */}
          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {WEEKDAY_LABELS.map((w) => (
              <div key={w} className="py-1.5 text-center text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">
                {w}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1.5">
            {gridDays.map((day) => {
              const key = dateKey(day);
              const inMonth = day.getUTCMonth() === currentMonth;
              const isToday = key === todayKey;
              const isSelected = key === selectedKey;
              const dayEvents = eventsByDay.get(key) ?? [];

              return (
                <button
                  key={key}
                  onClick={() => setSelectedDate(day)}
                  className={`flex aspect-square flex-col items-center justify-start gap-1 rounded-lg border pt-1.5 transition ${
                    isSelected
                      ? "border-[#3B82F6] bg-[#EFF6FF]"
                      : "border-transparent hover:bg-[#F4F5F7]"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[12px] ${
                      isToday
                        ? "bg-[#3B82F6] font-bold text-white"
                        : inMonth
                        ? isSelected ? "font-bold text-[#1F2937]" : "text-[#1F2937]"
                        : "text-[#D1D5DB]"
                    }`}
                  >
                    {day.getUTCDate()}
                  </span>
                  <div className="flex h-1.5 items-center gap-0.5">
                    {dayEvents.length > 0 &&
                      Array.from({ length: Math.min(dayEvents.length, 3) }).map((_, i) => (
                        <span key={i} className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]" />
                      ))}
                  </div>
                </button>
              );
            })}
          </div>

          {loading && (
            <p className="mt-3 text-center text-[11px] text-[#9CA3AF]">Loading events…</p>
          )}
        </div>

        {/* ── Selected day panel ── */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#9CA3AF]">Selected Date</p>
          <p className="mb-4 text-[14px] font-bold text-[#1F2937]">{formatFullLabel(selectedDate)}</p>

          {selectedDayEvents.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No events on this day."
              action={
                <button
                  onClick={() => openAddSheet(selectedDate)}
                  className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white shadow-sm transition hover:bg-[#2563EB]"
                >
                  <Plus size={14} />
                  Add Event
                </button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {selectedDayEvents.map((ev) => (
                <div key={ev.id} className="rounded-lg border border-[#F4F5F7] p-3">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-[#1F2937]">{ev.title}</p>
                    <div className="flex shrink-0 items-center gap-0.5">
                      <button
                        onClick={() => openEditSheet(ev)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F4F5F7]"
                        title="Edit"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => { setDeleteTarget(ev); setDeleteError(""); }}
                        className="flex h-7 w-7 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  {ev.event_type && <div className="mb-1.5"><EventTypeBadge type={ev.event_type} /></div>}
                  {ev.description && (
                    <p className="mb-1.5 text-[12px] leading-relaxed text-[#6B7280]">{ev.description}</p>
                  )}
                  {ev.meeting && (
                    <p className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                      <Link2 size={11} />
                      Linked to meeting: {ev.meeting.title || ev.meeting.meeting_type}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Event sheet ── */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent widthClassName="max-w-md">
          <SheetHeader>
            <SheetTitle>{editingEvent ? "Edit Event" : "Add Event"}</SheetTitle>
            <SheetClose />
          </SheetHeader>
          <SheetBody>
            {formError && (
              <div className="mb-4 rounded-lg bg-red-50 px-4 py-2.5 text-[12px] font-medium text-red-600">
                {formError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Barangay Assembly"
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Optional details…"
                  className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Date *
                </label>
                <input
                  type="date"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#3B82F6]"
                />
              </div>

              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                  Event Type
                </label>
                <select
                  value={eventTypeSelect}
                  onChange={(e) => setEventTypeSelect(e.target.value)}
                  className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-[#3B82F6]"
                >
                  <option value="">None</option>
                  {EVENT_TYPE_PRESETS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                  <option value="Other">Other…</option>
                </select>
                {eventTypeSelect === "Other" && (
                  <input
                    value={eventTypeOther}
                    onChange={(e) => setEventTypeOther(e.target.value)}
                    placeholder="Specify event type"
                    className="mt-2 w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
                  />
                )}
              </div>
            </div>
          </SheetBody>
          <SheetFooter>
            <button
              onClick={() => setSheetOpen(false)}
              className="rounded-lg px-4 py-2.5 text-[13px] font-bold text-[#6B7280] transition hover:bg-[#F4F5F7]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-4 py-2.5 text-[13px] font-bold text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-50"
            >
              {submitting ? "Saving…" : editingEvent ? "Save Changes" : "Add Event"}
            </button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Event"
        message={
          deleteError
            ? deleteError
            : `Are you sure you want to delete "${deleteTarget?.title}"? This can't be undone.`
        }
        confirmLabel="Yes, Delete"
        cancelLabel="Cancel"
        variant="danger"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => { setDeleteTarget(null); setDeleteError(""); }}
      />
    </div>
  );
}