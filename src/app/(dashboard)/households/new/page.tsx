"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Home, User, Search, X } from "lucide-react";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Purok {
  id: number;
  name: string;
}

interface UnassignedResident {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: string;
  sex: string;
  civil_status: string;
  occupation: string | null;
}

function memberFullName(m: UnassignedResident) {
  const ext = m.name_extension ? ` ${m.name_extension}` : "";
  const mi  = m.mname ? ` ${m.mname[0]}.` : "";
  return `${m.lname}, ${m.fname}${ext}${mi}`;
}

function calcAge(birthdate: string) {
  const today = new Date();
  const dob   = new Date(birthdate);
  let age     = today.getFullYear() - dob.getFullYear();
  const m     = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

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

// Searches real, currently-unassigned residents via GET /api/residents?search=&unassigned=true
function HeadPicker({
  value,
  onChange,
}: {
  value: UnassignedResident | null;
  onChange: (r: UnassignedResident | null) => void;
}) {
  const [query, setQuery]     = useState("");
  const [open, setOpen]       = useState(false);
  const [results, setResults] = useState<UnassignedResident[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // Nothing to clear here: the dropdown only renders when
      // `query.trim()` is truthy, so stale `results` are never shown
      // while the query is empty. No setState needed in that case.
      return;
    }

    let ignore = false;

    const timeout = setTimeout(() => {
      if (ignore) return;
      setLoading(true);

      const params = new URLSearchParams({ search: q, unassigned: "true", limit: "10" });
      fetch(`/api/residents?${params}`)
        .then((r) => r.json())
        .then((data) => {
          if (!ignore) setResults(data.residents ?? []);
        })
        .catch(() => {
          if (!ignore) setResults([]);
        })
        .finally(() => {
          if (!ignore) setLoading(false);
        });
    }, 300); // debounce

    return () => {
      ignore = true;
      clearTimeout(timeout);
    };
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-[#E9EAEC] bg-[#F9FAFB] px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#1F2937]">{memberFullName(value)}</p>
          <p className="truncate text-[11px] text-[#9CA3AF]">
            {value.sex} &middot; {calcAge(value.birthdate)} yrs old
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] transition hover:bg-[#E9EAEC] hover:text-[#374151]"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search resident (unassigned to a household)..."
          className="w-full rounded-xl border border-[#E9EAEC] bg-white py-3 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none focus:border-[#3B82F6]"
        />
      </div>
      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-[#E9EAEC] bg-white shadow-lg">
          {loading ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">Searching…</p>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">No unassigned residents found</p>
          ) : (
            results.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  onChange(r);
                  setQuery("");
                  setOpen(false);
                }}
                className="flex w-full items-center justify-between gap-2 border-b border-[#F4F5F7] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[#F9FAFB]"
              >
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937]">{memberFullName(r)}</p>
                  <p className="text-[11px] text-[#9CA3AF]">
                    {r.sex} &middot; {calcAge(r.birthdate)} yrs old
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function NewHouseholdPage() {
  const router = useRouter();

  const [puroks, setPuroks] = useState<Purok[]>([]);

  useEffect(() => {
    let ignore = false;

    fetch("/api/puroks")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || body.message || `Request failed (${r.status})`);
        }
        return r.json();
      })
      .then((json) => {
        if (!ignore && Array.isArray(json)) setPuroks(json);
      })
      .catch((e) => console.error("Failed to load puroks from /api/puroks:", e.message));

    return () => { ignore = true; };
  }, []);

  const [purokId, setPurokId] = useState("");
  const [address, setAddress] = useState("");
  const [housingType, setHousingType] = useState("");
  const [waterSource, setWaterSource] = useState("");
  const [comfortRoom, setComfortRoom] = useState("");
  const [head, setHead] = useState<UnassignedResident | null>(null);

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      const res = await fetch("/api/households", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purok_id: parseInt(purokId),
          address,
          housing_type: housingType || undefined,
          water_source: waterSource || undefined,
          comfort_room: comfortRoom || undefined,
          household_head_id: head?.id ?? undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || err.error || "Failed to create household.");
      }

      const created = await res.json();

      if (head) {
        const patchRes = await fetch(`/api/residents/${head.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ household_id: created.id }),
        });

        if (!patchRes.ok) {
          const err = await patchRes.json().catch(() => ({}));
          // Household was already created at this point — surface the
          // problem but don't lose the household that was just made.
          throw new Error(
            err.message || err.error ||
            `Household was created, but failed to link ${memberFullName(head)} as head.`
          );
        }
      }

      router.push(`/households/${created.id}`);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Something went wrong while creating the household. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <button
        onClick={() => router.push("/households")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Households
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">Add Household</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
          A household number will be generated automatically once saved.
        </p>
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
              options={puroks.map((p) => ({ value: String(p.id), label: p.name }))}
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

          <div className="border-t border-[#F4F5F7] pt-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F5F7]">
                <User size={14} className="text-[#374151]" />
              </div>
              <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">
                Household Head <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span>
              </p>
            </div>
            <HeadPicker value={head} onChange={setHead} />
            <p className="mt-1.5 text-[11px] text-[#9CA3AF]">
              Only residents not currently attached to another household are shown. You can also assign a head later
              from the household detail page.
            </p>
          </div>

          {error && <p className="rounded-lg bg-[#FEE2E2] px-4 py-3 text-[12px] text-[#DC2626]">{error}</p>}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => router.push("/households")}
              className="text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:text-[#1F2937]"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Save Household"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}