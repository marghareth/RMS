// FILE: src/app/(dashboard)/households/[id]/edit/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Home } from "lucide-react";
import EmptyState from "@/components/shared/EmptyState";
import { HouseholdMock } from "@/lib/mock/households";

interface Purok { id: number; name: string }

const HOUSING_OPTIONS = [
  { value: "OWN", label: "Own" },
  { value: "RENT", label: "Rent" },
  { value: "SHARED", label: "Shared" },
  { value: "INFORMAL", label: "Informal" },
  { value: "OTHER", label: "Other" },
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
const TENURE_OPTIONS = [
  { value: "OWNER", label: "Owner" },
  { value: "RENTER", label: "Renter" },
  { value: "CARETAKER", label: "Caretaker" },
  { value: "SHARER", label: "Sharer" },
  { value: "OTHER", label: "Other" },
];
const HOUSEHOLD_UNIT_OPTIONS = [
  { value: "SINGLE_HOUSE", label: "Single House" },
  { value: "DUPLEX", label: "Duplex" },
  { value: "APARTMENT", label: "Apartment" },
  { value: "OTHER", label: "Other" },
];
const WASTE_OPTIONS = [
  { value: "COLLECTED", label: "Collected" },
  { value: "BURNED", label: "Burned" },
  { value: "BURIED", label: "Buried" },
  { value: "COMPOSTED", label: "Composted" },
  { value: "OTHER", label: "Other" },
];
const POWER_OPTIONS = [
  { value: "ELECTRIC_METERED", label: "Electric (Metered)" },
  { value: "ELECTRIC_SHARED", label: "Electric (Shared)" },
  { value: "SOLAR", label: "Solar" },
  { value: "NONE", label: "None" },
  { value: "OTHER", label: "Other" },
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
      <label className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
        {label}
        {required && <span className="ml-0.5 text-red-500 dark:text-red-400">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-3 pr-8 text-[13px] text-[#1F2937] dark:text-white outline-none focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
        >
          <option value="">SELECT</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-[#9CA3AF] dark:text-[#A3A3A3]">▼</span>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] px-4 py-3 text-[13px] text-[#1F2937] dark:text-white outline-none placeholder:text-[#D1D5DB] dark:placeholder:text-[#525252] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
      />
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
  const [puroks, setPuroks] = useState<Purok[]>([]);

  // Form fields — declared before the effect below, since the effect's
  // fetch callback calls their setters. Their initial values don't need to
  // read from `original` (it's always null on first render); the fetch
  // effect populates them for real as soon as data arrives.
  const [purokId, setPurokId] = useState("");
  const [address, setAddress] = useState("");
  const [housingType, setHousingType] = useState("");
  const [housingTypeOther, setHousingTypeOther] = useState("");
  const [waterSource, setWaterSource] = useState("");
  const [comfortRoom, setComfortRoom] = useState("");

  // ── DILG/BIMS enhancements (2.8) ──
  const [tenureStatus, setTenureStatus] = useState("");
  const [tenureOther, setTenureOther] = useState("");
  const [householdUnit, setHouseholdUnit] = useState("");
  const [householdUnitOther, setHouseholdUnitOther] = useState("");
  const [noOfFamilies, setNoOfFamilies] = useState("");
  const [monthlyIncome, setMonthlyIncome] = useState("");
  const [wasteDisposal, setWasteDisposal] = useState("");
  const [powerSupply, setPowerSupply] = useState("");

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
        setHousingTypeOther(data.housing_type_other ?? "");
        setWaterSource(data.water_source ?? "");
        setComfortRoom(data.comfort_room ?? "");
        setTenureStatus(data.tenure_status ?? "");
        setTenureOther(data.tenure_other ?? "");
        setHouseholdUnit(data.household_unit ?? "");
        setHouseholdUnitOther(data.household_unit_other ?? "");
        setNoOfFamilies(data.no_of_families != null ? String(data.no_of_families) : "");
        setMonthlyIncome(data.monthly_income != null ? String(data.monthly_income) : "");
        setWasteDisposal(data.waste_disposal ?? "");
        setPowerSupply(data.power_supply ?? "");
      } catch (e) {
        console.error(e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadHousehold();
    return () => { cancelled = true; };
  }, [householdId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/puroks")
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setPuroks(data);
      })
      .catch((e) => console.error("Failed to load puroks from /api/puroks:", e));
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
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
            className="rounded-lg bg-[#3B82F6] px-4 py-2 text-[12px] font-bold text-white transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6]"
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
          housing_type_other: housingType === "OTHER" ? housingTypeOther || undefined : null,
          water_source: waterSource || undefined,
          comfort_room: comfortRoom || undefined,

          tenure_status: tenureStatus || undefined,
          tenure_other: tenureStatus === "OTHER" ? tenureOther || undefined : null,
          household_unit: householdUnit || undefined,
          household_unit_other: householdUnit === "OTHER" ? householdUnitOther || undefined : null,
          no_of_families: noOfFamilies ? parseInt(noOfFamilies) : undefined,
          monthly_income: monthlyIncome ? parseFloat(monthlyIncome) : undefined,
          waste_disposal: wasteDisposal || undefined,
          power_supply: powerSupply || undefined,
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
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
      >
        <ArrowLeft size={14} />
        Back to Household
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937] dark:text-white">Edit Household</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF] dark:text-[#A3A3A3]">{original.household_no}</p>
      </div>

      <div className="space-y-5">
        {/* General Information */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF] dark:bg-blue-500/15">
              <Home size={14} className="text-[#1D4ED8] dark:text-[#93C5FD]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">General Information</p>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Purok"
                value={purokId}
                onChange={setPurokId}
                options={puroks.map((p) => ({ value: String(p.id), label: p.name }))}
                required
              />
              <TextField label="House Address *" value={address} onChange={setAddress} placeholder="House No./Street" />
            </div>
          </div>
        </div>

        {/* Classification */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <p className="mb-4 text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Classification</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Housing Type" value={housingType} onChange={setHousingType} options={HOUSING_OPTIONS} />
              {housingType === "OTHER" && (
                <TextField label="Specify Housing Type" value={housingTypeOther} onChange={setHousingTypeOther} placeholder="e.g. Boarding house" />
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Tenure Status" value={tenureStatus} onChange={setTenureStatus} options={TENURE_OPTIONS} />
              {tenureStatus === "OTHER" && (
                <TextField label="Specify Tenure Status" value={tenureOther} onChange={setTenureOther} placeholder="e.g. Informal settler" />
              )}
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField label="Household Unit" value={householdUnit} onChange={setHouseholdUnit} options={HOUSEHOLD_UNIT_OPTIONS} />
              {householdUnit === "OTHER" && (
                <TextField label="Specify Household Unit" value={householdUnitOther} onChange={setHouseholdUnitOther} placeholder="e.g. Bunkhouse" />
              )}
            </div>
          </div>
        </div>

        {/* National Indicators (DILG/BIMS) */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <p className="mb-4 text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
            National Indicators (DILG/BIMS)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SelectField label="Water System" value={waterSource} onChange={setWaterSource} options={WATER_OPTIONS} />
            <SelectField label="Waste Disposal" value={wasteDisposal} onChange={setWasteDisposal} options={WASTE_OPTIONS} />
            <SelectField label="Power Supply" value={powerSupply} onChange={setPowerSupply} options={POWER_OPTIONS} />
            <SelectField label="Toilet Type" value={comfortRoom} onChange={setComfortRoom} options={CR_OPTIONS} />
          </div>
        </div>

        {/* Demographics */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#262626] bg-white dark:bg-[#171717] p-5">
          <p className="mb-4 text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Demographics</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label="No. of Families" value={noOfFamilies} onChange={setNoOfFamilies} type="number" placeholder="1" />
            <TextField label="Monthly Income (₱)" value={monthlyIncome} onChange={setMonthlyIncome} type="number" placeholder="0.00" />
          </div>
        </div>

        <div className="rounded-lg bg-[#F9FAFB] dark:bg-[#171717] px-4 py-3">
          <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">
            To change the household head or members, use the Add Member / Set as Head actions on the household
            detail page instead.
          </p>
        </div>

        {error && <p className="rounded-lg bg-[#FEE2E2] dark:bg-red-500/15 px-4 py-3 text-[12px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={() => router.push(`/households/${householdId}`)}
            className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3] transition hover:text-[#1F2937] dark:hover:text-white"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
          >
            {submitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}