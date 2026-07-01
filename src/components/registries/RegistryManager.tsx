"use client";

import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Plus, Search } from "lucide-react";
import { getMockRegistries } from "@/lib/mockRegistries";

interface RegistryManagerProps {
  registryType: "FOUR_PS" | "PWD" | "SENIOR_CITIZEN";
  title: string;
  subtitle: string;
  icon: LucideIcon;
  addNote?: string;
  minAge?: number;
}

function calcAge(birthdate: string) {
  const today = new Date();
  const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age -= 1;
  }
  return age;
}

export default function RegistryManager({
  registryType,
  title,
  subtitle,
  icon: Icon,
  addNote,
  minAge,
}: RegistryManagerProps) {
  const [search, setSearch] = useState("");

  const entries = useMemo(() => {
    const allEntries = getMockRegistries();

    return allEntries.filter((entry) => {
      if (registryType === "SENIOR_CITIZEN") {
        return calcAge(entry.resident.birthdate) >= (minAge ?? 60) && entry.registry_type === "SENIOR_CITIZEN";
      }

      return entry.registry_type === registryType;
    });
  }, [registryType, minAge]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;

    const keyword = search.toLowerCase();
    return entries.filter((entry) =>
      `${entry.resident.fname} ${entry.resident.lname}`.toLowerCase().includes(keyword) ||
      entry.resident.purok?.name.toLowerCase().includes(keyword),
    );
  }, [entries, search]);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-[#E9EAEC] bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#3B82F6]/10 text-[#3B82F6]">
                <Icon size={18} />
              </div>
              <div>
                <h1 className="text-[15px] font-black uppercase tracking-wide text-[#1F2937]">{title}</h1>
                <p className="text-[12px] text-[#6B7280]">{subtitle}</p>
              </div>
            </div>
            {addNote && <p className="mt-3 text-[12px] text-[#6B7280]">{addNote}</p>}
          </div>
          <button className="flex items-center gap-2 rounded-lg border border-[#E9EAEC] px-3 py-2 text-[12px] font-semibold text-[#1F2937] hover:bg-[#F4F5F7]">
            <Plus size={14} /> Add
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-[#E9EAEC] bg-white p-4 shadow-sm">
        <div className="relative mb-4">
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search resident"
            className="w-full rounded-xl border border-[#E9EAEC] bg-[#F4F5F7] py-2.5 pl-9 pr-3 text-[13px] text-[#1F2937] outline-none focus:border-[#3B82F6] focus:bg-white"
          />
        </div>

        {filteredEntries.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[#E9EAEC] bg-[#F9FAFB] p-6 text-center text-[12px] text-[#9CA3AF]">
            No residents found in this registry yet.
          </div>
        ) : (
          <div className="space-y-2">
            {filteredEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between rounded-xl border border-[#E9EAEC] px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-[#1F2937]">
                    {entry.resident.fname} {entry.resident.lname}
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    {entry.resident.purok?.name ?? "No purok"} · {calcAge(entry.resident.birthdate)} yrs old
                  </p>
                </div>
                <div className="rounded-full bg-[#3B82F6]/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-[#3B82F6]">
                  {title}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}