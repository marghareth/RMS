// FILE: src/app/(dashboard)/health/vaccinations/new/page.tsx
//
// Redesign (Nov 2026): one plain form instead of three boxed sections with
// coloured icon tiles; the vaccine is picked from grouped radio lists
// instead of large outlined chips; sentence-case headings and labels; a
// one-line summary beside the buttons instead of a tinted summary box.
//
// WHAT WAS WRONG: same issue as health/new/page.tsx — a local ResidentPicker
// searched a hardcoded MOCK_RESIDENTS array instead of the real database.
// It also preselected a resident from that same mock array when arriving
// via ?resident_id=..., which would silently fail to preselect anything
// real. Fixed by swapping in the shared ResidentPicker
// (src/components/shared/ResidentPicker.tsx) and, when a resident_id is
// passed in the URL, fetching that resident's real record from
// GET /api/residents/[id] to preselect it.

"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import ResidentPicker, {
  PickedResident,
} from "@/components/shared/ResidentPicker";
import { useCan } from "@/lib/hooks/useCan";
import { lifeEventProblems, problemFor } from "@/lib/form-rules";
import FieldError, { fieldErrorBorder } from "@/components/shared/FieldError";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface VaccinationForm {
  resident_id: string;
  vaccine_name: string;
  custom_vaccine: string;
  date_given: string;
}

// Grouped vaccines for the picker
const VACCINE_GROUPS = [
  {
    group: "Routine immunization (EPI)",
    vaccines: [
      "BCG",
      "DPT (1st dose)",
      "DPT (2nd dose)",
      "DPT (3rd dose)",
      "OPV (1st dose)",
      "OPV (2nd dose)",
      "OPV (3rd dose)",
      "MMR",
      "Hepatitis B (1st)",
      "Hepatitis B (2nd)",
      "Hepatitis B (3rd)",
    ],
  },
  {
    group: "COVID-19",
    vaccines: [
      "COVID-19 (1st dose)",
      "COVID-19 (2nd dose)",
      "COVID-19 Booster",
    ],
  },
  {
    group: "Other vaccines",
    vaccines: [
      "Influenza",
      "Tetanus Toxoid",
      "Rabies",
      "Typhoid",
      "Pneumococcal",
      "Varicella",
      "Other (specify)",
    ],
  },
];

// ─── VACCINE PICKER ───────────────────────────────────────────────────────────
// Grouped radio lists: easy to scan, one click to pick, keyboard friendly
// (arrow keys move within the list, as with any radio group).
function VaccinePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Vaccine"
      className="grid gap-x-8 gap-y-5 sm:grid-cols-3"
    >
      {VACCINE_GROUPS.map((g) => (
        <fieldset key={g.group} className="min-w-0">
          <legend className="mb-1.5 text-[12.5px] font-medium text-[#374151] dark:text-[#D4D4D4]">
            {g.group}
          </legend>
          <div className="space-y-0.5">
            {g.vaccines.map((v) => {
              const selected = value === v;
              return (
                <label
                  key={v}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-[13px] transition ${
                    selected
                      ? "bg-(--brand-tint) font-medium text-[#1F2937] dark:bg-(--brand)/15 dark:text-white"
                      : "text-[#374151] hover:bg-[#F4F5F7] dark:text-[#D4D4D4] dark:hover:bg-[#1F1F1F]"
                  }`}
                >
                  <input
                    type="radio"
                    name="vaccine"
                    value={v}
                    checked={selected}
                    onChange={() => onChange(v)}
                    className="h-3.5 w-3.5 accent-(--brand)"
                  />
                  {v === "Other (specify)" ? "Other" : v}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
// BUGFIX: `next build` failed with "useSearchParams() should be wrapped in a
// suspense boundary". Split into an inner component plus a thin default
// export that wraps it in <Suspense> — see equipment/borrow/page.tsx for the
// same fix and a link to the Next.js docs on why this is required.
export default function NewVaccinationPage() {
  return (
    <Suspense fallback={null}>
      <NewVaccinationPageInner />
    </Suspense>
  );
}

function NewVaccinationPageInner() {
  const router = useRouter();
  const can = useCan();
  const searchParams = useSearchParams();
  const preResidentId = searchParams.get("resident_id");

  const [selectedResident, setSelectedResident] =
    useState<PickedResident | null>(null);
  const [form, setForm] = useState<VaccinationForm>({
    resident_id: preResidentId ?? "",
    vaccine_name: "",
    custom_vaccine: "",
    date_given: new Date().toISOString().split("T")[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // If we arrived via ?resident_id=..., look up the real resident record
  // so the picker shows an actual selected resident instead of nothing.
  useEffect(() => {
    if (!preResidentId) return;
    fetch(`/api/residents/${preResidentId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setSelectedResident(data);
      })
      .catch((e) => console.error(e));
  }, [preResidentId]);

  const set = (k: keyof VaccinationForm, v: string) =>
    setForm((p) => ({ ...p, [k]: v }));

  function handleSelectResident(r: PickedResident | null) {
    setSelectedResident(r);
    set("resident_id", r ? String(r.id) : "");
  }

  const finalVaccineName =
    form.vaccine_name === "Other (specify)"
      ? form.custom_vaccine
      : form.vaccine_name;

  // Not in the future, not before the person was born (src/lib/form-rules.ts; the API checks too).
  const dateGivenError = problemFor(
    lifeEventProblems(
      "date_given",
      form.date_given,
      "Date given",
      selectedResident?.birthdate,
    ),
    "date_given",
  );

  async function handleSave() {
    if (!form.resident_id || !finalVaccineName || !form.date_given) {
      setError("Please fill in all required fields.");
      return;
    }
    if (dateGivenError) {
      setError(dateGivenError);
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/health/vaccinations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resident_id: parseInt(form.resident_id),
          vaccine_name: finalVaccineName,
          date_given: form.date_given,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save vaccination");
      }
      router.push("/health");
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  const isValid = form.resident_id && finalVaccineName && form.date_given;

  const LABEL =
    "mb-1.5 block text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]";
  const INPUT =
    "w-full rounded-lg border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-(--brand-line) dark:border-[#333333] dark:bg-[#171717] dark:text-white dark:placeholder:text-[#737373]";
  const prettyDate = form.date_given
    ? new Date(form.date_given + "T00:00:00").toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : "";

  return (
    <div className="mx-auto max-w-3xl">
      {!can("health:write") && (
        <p
          role="note"
          className="mb-4 text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]"
        >
          This form adds a vaccination record, which your account can&apos;t do.
          To see vaccination records, open{" "}
          <Link
            href="/health"
            className="font-medium text-(--brand-fg) hover:underline"
          >
            Health › Vaccinations
          </Link>
          .
        </p>
      )}
      {/* ── Page header ── */}
      <div className="mb-6 flex items-start gap-2">
        <button
          onClick={() => router.push("/health")}
          aria-label="Back to health"
          className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F4F5F7] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-[22px] font-semibold leading-tight text-[#1B2430] dark:text-white">
            Add vaccination
          </h1>
          <p className="mt-0.5 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
            Record a vaccine given to a resident.
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] bg-white dark:border-[#262626] dark:bg-[#171717]">
        {/* ── Resident ── */}
        <div
          data-tour="page-health-vaccination-new-resident"
          className="px-5 py-5"
        >
          <label className={LABEL}>
            Resident <span className="text-red-500 dark:text-red-400">*</span>
          </label>
          <ResidentPicker
            value={selectedResident}
            onChange={handleSelectResident}
            placeholder="Search resident by name"
          />
        </div>

        {/* ── Vaccine ── */}
        <div
          data-tour="page-health-vaccination-new-vaccine"
          className="border-t border-[#F0F1F3] px-5 py-5 dark:border-[#262626]"
        >
          <p className="mb-3 text-[13.5px] font-semibold text-[#1F2937] dark:text-white">
            Vaccine <span className="text-red-500 dark:text-red-400">*</span>
          </p>
          <VaccinePicker
            value={form.vaccine_name}
            onChange={(v) => set("vaccine_name", v)}
          />

          {form.vaccine_name === "Other (specify)" && (
            <div className="mt-4 max-w-sm">
              <label htmlFor="custom-vaccine" className={LABEL}>
                Vaccine name{" "}
                <span className="text-red-500 dark:text-red-400">*</span>
              </label>
              <input
                id="custom-vaccine"
                autoFocus
                value={form.custom_vaccine}
                onChange={(e) => set("custom_vaccine", e.target.value)}
                placeholder="e.g. Japanese Encephalitis"
                className={INPUT}
              />
            </div>
          )}
        </div>

        {/* ── Date given ── */}
        <div
          data-tour="page-health-vaccination-new-date"
          className="border-t border-[#F0F1F3] px-5 py-5 dark:border-[#262626]"
        >
          <div className="max-w-xs">
            <label htmlFor="date-given" className={LABEL}>
              Date given{" "}
              <span className="text-red-500 dark:text-red-400">*</span>
            </label>
            <input
              id="date-given"
              type="date"
              value={form.date_given}
              max={new Date().toLocaleDateString("en-CA")}
              min={selectedResident?.birthdate?.slice(0, 10)}
              onChange={(e) => set("date_given", e.target.value)}
              aria-invalid={!!dateGivenError}
              className={`${INPUT} ${dateGivenError ? fieldErrorBorder : ""}`}
            />
            <FieldError message={dateGivenError} />
          </div>
        </div>

        {/* ── Summary and actions ── */}
        <div
          data-tour="page-health-vaccination-new-save"
          className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0F1F3] px-5 py-4 dark:border-[#262626]"
        >
          <div className="min-w-0 text-[12.5px]">
            {error ? (
              <p className="text-[#DC2626] dark:text-[#F87171]">{error}</p>
            ) : isValid ? (
              <p className="text-[#6B7280] dark:text-[#A3A3A3]">
                <span className="font-medium text-[#1F2937] dark:text-white">
                  {finalVaccineName}
                </span>
                {" for "}
                <span className="font-medium text-[#1F2937] dark:text-white">
                  {selectedResident
                    ? `${selectedResident.lname}, ${selectedResident.fname}`
                    : ""}
                </span>
                {selectedResident?.purok?.name
                  ? ` · ${selectedResident.purok.name}`
                  : ""}{" "}
                · {prettyDate}
              </p>
            ) : (
              <p className="text-[#9CA3AF] dark:text-[#737373]">
                Pick a resident, a vaccine and the date it was given.
              </p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              onClick={() => router.push("/health")}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#6B7280] transition hover:bg-[#F4F5F7] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
            >
              Cancel
            </button>
            {can("health:write") && (
              <button
                onClick={handleSave}
                disabled={saving || !isValid}
                className="rounded-lg bg-(--brand) px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-(--brand-hover) disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save vaccination"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}