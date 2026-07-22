// FILE: src/components/shared/ResidentPicker.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

export interface PickedPurok {
  id: number;
  name: string;
}

export interface PickedResident {
  id: number;
  fname: string;
  lname: string;
  mname: string | null;
  name_extension: string | null;
  birthdate: string;
  sex: string;
  purok: PickedPurok | null;
  // Optional — the /api/residents endpoint this component calls already
  // returns these (it includes purok + household on every resident), they
  // just weren't part of this type before. Added so consumers that need
  // more than name/age/purok (e.g. the Barangay ID form) don't need a
  // second fetch or a separate picker component.
  civil_status?: string;
  household?: { id: number; address: string } | null;
}

function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function fullName(r: PickedResident) {
  const ext = r.name_extension ? ` ${r.name_extension}` : "";
  const mi = r.mname ? ` ${r.mname[0]}.` : "";
  return `${r.lname}, ${r.fname}${ext}${mi}`;
}

interface ResidentPickerProps {
  value: PickedResident | null;
  onChange: (resident: PickedResident | null) => void;
  placeholder?: string;
  /** If set, results below this age are still selectable but visibly flagged. */
  minAge?: number;
  disabled?: boolean;
}

export default function ResidentPicker({
  value,
  onChange,
  placeholder = "Search resident by name...",
  minAge,
  disabled = false,
}: ResidentPickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PickedResident[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      // Avoid calling setState synchronously within the effect body — schedule
      // the update asynchronously to prevent cascading renders per the lint rule.
      Promise.resolve().then(() => {
        setResults([]);
        setLoading(false);
      });
      return;
    }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/residents?search=${encodeURIComponent(query)}&limit=8`);
        const data = await res.json();
        setResults(data.residents ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (value) {
    const age = calcAge(value.birthdate);
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-[#E9EAEC] bg-[#F9FAFB] px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-semibold text-[#1F2937]">{fullName(value)}</p>
          <p className="truncate text-[11px] text-[#9CA3AF]">
            {value.sex} &middot; {age} yrs old &middot; {value.purok?.name ?? "No purok"}
          </p>
        </div>
        {!disabled && (
          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Clear selected resident"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] transition hover:bg-[#E9EAEC] hover:text-[#374151]"
          >
            <X size={14} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative">
      <div className="relative">
        <Search
          size={15}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
        />
        <input
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-lg border border-[#E9EAEC] bg-white py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6] disabled:bg-[#F4F5F7]"
        />
      </div>

      {open && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-lg border border-[#E9EAEC] bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-4 text-center text-[12px] text-[#9CA3AF]">No residents found</p>
          ) : (
            results.map((r) => {
              const age = calcAge(r.birthdate);
              const belowMinAge = minAge !== undefined && age < minAge;
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onChange(r);
                    setQuery("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between gap-2 border-b border-[#F4F5F7] px-3 py-2.5 text-left transition last:border-b-0 hover:bg-[#F9FAFB]"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-semibold text-[#1F2937]">{fullName(r)}</p>
                    <p className="truncate text-[11px] text-[#9CA3AF]">
                      {r.sex} &middot; {age} yrs old &middot; {r.purok?.name ?? "No purok"}
                    </p>
                  </div>
                  {belowMinAge && (
                    <span className="shrink-0 rounded-full bg-[#FEF3C7] px-2 py-0.5 text-[10px] font-semibold text-[#D97706]">
                      Under {minAge}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}