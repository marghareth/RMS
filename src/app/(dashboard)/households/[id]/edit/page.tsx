"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { MOCK_PUROKS, HouseholdMock } from "@/lib/mock/households";

const HOUSING_OPTIONS = [
  { value: "OWN", label: "Own" },
  { value: "RENT", label: "Rent" },
  { value: "SHARED", label: "Shared" },
  { value: "INFORMAL", label: "Informal" },
];
const WATER_OPTIONS = [
  { value: "INDIVIDUAL", label: "Individual" },
  { value: "COMMUNAL", label: "Communal" },
  { value: "WELL", label: "Well" },
  { value: "OTHER", label: "Other" },
];
const CR_OPTIONS = [
  { value: "OWN", label: "Own" },
  { value: "SHARED", label: "Shared" },
  { value: "NONE", label: "None" },
];

function SelectField({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
        {label}
        {required && <span className="ml-0.5 text-red-500">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-[#E9EAEC] bg-white px-4 py-3 pr-8 text-[13px] text-[#1F2937] outline-none focus:border-[#3B82F6]"
        >
          <option value="">SELECT</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#9CA3AF]">▼</span>
      </div>
    </div>
  );
}

export default function EditHouseholdPage() {
  const router = useRouter();
  const params = useParams();
  const householdId = Number(params.id);

  // ── REAL DATA FETCH ───────────────────────────────────────────────────────
  const [original, setOriginal] = useState<HouseholdMock | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields — declared before the effect below, since the effect's
  // fetch callback calls their setters. Their initial values don't need to
  // read from `original` (it's always null on first render); the fetch
  // effect populates them for real as soon as data arrives.
  const [purokId, setPurokId] = useState("");
  const [address, setAddress] = useState("");
  const [housingType, setHousingType] = useState("");
  const [waterSource, setWaterSource] = useState("");
  const [comfortRoom, setComfortRoom] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadHousehold() {
      setLoading(true);
      try {
        const res = await fetch(`/api/households/${householdId}`);
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        if (cancelled) return;
        setOriginal(data);
        setPurokId(String(data.purok_id));
        setAddress(data.address);
        setHousingType(data.housing_type ?? "");
        setWaterSource(data.water_source ?? "");
        setComfortRoom(data.comfort_room ?? "");
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHousehold();
    return () => { cancelled = true; };
  }, [householdId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
      </div>
    );
  }

  if (!original) {
    return (
      <EmptyState
        icon={Home}
        title="Household not found"
        description="This household doesn't exist or may have been removed."
        action={
          <button
            onClick={() => router.push("/households")}
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB]"
          >
            Back to Households
          </button>
        }
      />
    );
  }

  async function handleSubmit() {
    setError("");
    if (!purokId) {
      setError("Please select a purok.");
      return;
    }
    if (!address.trim()) {
      setError("Please enter the house address.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/households/${householdId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purok_id: parseInt(purokId),
          address,
          housing_type: housingType || undefined,
          water_source: waterSource || undefined,
          comfort_room: comfortRoom || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to update household");
      router.push(`/households/${householdId}`);
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
        onClick={() => router.push(`/households/${householdId}`)}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Household
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">Edit Household</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">{original.household_no}</p>
      </div>

      <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
            <Home size={14} className="text-[#1D4ED8]" />
          </div>
          <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">General Information</p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField
              label="Purok"
              value={purokId}
              onChange={setPurokId}
              options={MOCK_PUROKS.map((p) => ({ value: String(p.id), label: p.name }))}
              required
            />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                House Address <span className="text-red-500">*</span>
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="House No./Street"
                className="rounded-xl border border-[#E9EAEC] bg-white px-4 py-3 text-[13px] text-[#1F2937] outline-none placeholder:text-[#D1D5DB] focus:border-[#3B82F6]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <SelectField label="Housing Type" value={housingType} onChange={setHousingType} options={HOUSING_OPTIONS} />
            <SelectField label="Water Source" value={waterSource} onChange={setWaterSource} options={WATER_OPTIONS} />
            <SelectField label="Comfort Room" value={comfortRoom} onChange={setComfortRoom} options={CR_OPTIONS} />
          </div>

          <div className="rounded-lg bg-[#F9FAFB] px-4 py-3">
            <p className="text-[11px] text-[#6B7280]">
              To change the household head or members, use the Add Member / Set as Head actions on the household
              detail page instead.
            </p>
          </div>

          {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push(`/households/${householdId}`)}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}