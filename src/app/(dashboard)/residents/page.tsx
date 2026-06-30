"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, ChevronRight, Plus, X } from "lucide-react";

// ── MOCK DATA ─────────────────────────────────────────────────────────────────
const mockResidents = [
  {
    id: "BM1000001",
    lastName: "CASTRO",
    firstName: "JOSE ENRIQUE SR.",
    middleInitial: "B.",
    sex: "MALE",
    purok: "PUROK II",
    dateOfBirth: "AUGUST 01, 1990",
    placeOfBirth: "SABANG, DANAO CITY, CEBU, PH 6004",
    civilStatus: "MARRIED",
    citizenship: "FILIPINO",
    educAttainment: "COLLEGE GRAD.",
    occupation: "TEACHER",
    age: 25,
    currentAddress: "PUROK II",
    sector: "N/A",
    cr: "OWN",
    house: "OWN",
    waterSource: "INDIVIDUAL",
    noHouseOfMember: 8,
    previousAddress: [
      { year: "2023", address: "PUROK IV" },
      { year: "1995", address: "PUROK I" },
    ],
  },
  {
    id: "BM1000002",
    lastName: "DUNGALO",
    firstName: "ANNA MARIE",
    middleInitial: "P.",
    sex: "FEMALE",
    purok: "PUROK I",
    dateOfBirth: "MARCH 15, 1985",
    placeOfBirth: "DANAO CITY, CEBU",
    civilStatus: "SINGLE",
    citizenship: "FILIPINO",
    educAttainment: "HIGH SCHOOL GRAD.",
    occupation: "HOUSEWIFE",
    age: 41,
    currentAddress: "PUROK I",
    sector: "SENIOR",
    cr: "OWN",
    house: "RENT",
    waterSource: "COMMUNAL",
    noHouseOfMember: 4,
    previousAddress: [],
  },
  {
    id: "BM1000003",
    lastName: "DUNGALO",
    firstName: "ANNA MARIE",
    middleInitial: "P.",
    sex: "FEMALE",
    purok: "PUROK I",
    dateOfBirth: "JULY 22, 1992",
    placeOfBirth: "CEBU CITY, CEBU",
    civilStatus: "MARRIED",
    citizenship: "FILIPINO",
    educAttainment: "COLLEGE GRAD.",
    occupation: "NURSE",
    age: 33,
    currentAddress: "PUROK I",
    sector: "N/A",
    cr: "RENT",
    house: "RENT",
    waterSource: "INDIVIDUAL",
    noHouseOfMember: 3,
    previousAddress: [{ year: "2020", address: "PUROK III" }],
  },
  {
    id: "BM1000004",
    lastName: "DUNGALO",
    firstName: "ANNA MARIE",
    middleInitial: "P.",
    sex: "FEMALE",
    purok: "PUROK I",
    dateOfBirth: "JANUARY 5, 1978",
    placeOfBirth: "MANDAUE CITY, CEBU",
    civilStatus: "WIDOWED",
    citizenship: "FILIPINO",
    educAttainment: "ELEMENTARY GRAD.",
    occupation: "FARMER",
    age: 48,
    currentAddress: "PUROK I",
    sector: "SENIOR",
    cr: "OWN",
    house: "OWN",
    waterSource: "INDIVIDUAL",
    noHouseOfMember: 6,
    previousAddress: [],
  },
  {
    id: "BM1000005",
    lastName: "DUNGALO",
    firstName: "ANNA MARIE",
    middleInitial: "P.",
    sex: "FEMALE",
    purok: "PUROK I",
    dateOfBirth: "SEPTEMBER 18, 2000",
    placeOfBirth: "DANAO CITY, CEBU",
    civilStatus: "SINGLE",
    citizenship: "FILIPINO",
    educAttainment: "COLLEGE UNDERGRAD.",
    occupation: "STUDENT",
    age: 25,
    currentAddress: "PUROK I",
    sector: "YOUTH",
    cr: "OWN",
    house: "OWN",
    waterSource: "COMMUNAL",
    noHouseOfMember: 5,
    previousAddress: [],
  },
  {
    id: "BM1000006",
    lastName: "DUNGALO",
    firstName: "ANNA MARIE",
    middleInitial: "P.",
    sex: "FEMALE",
    purok: "PUROK I",
    dateOfBirth: "DECEMBER 30, 1995",
    placeOfBirth: "CEBU CITY, CEBU",
    civilStatus: "MARRIED",
    citizenship: "FILIPINO",
    educAttainment: "COLLEGE GRAD.",
    occupation: "TEACHER",
    age: 30,
    currentAddress: "PUROK I",
    sector: "N/A",
    cr: "OWN",
    house: "RENT",
    waterSource: "INDIVIDUAL",
    noHouseOfMember: 2,
    previousAddress: [],
  },
  {
    id: "BM1000007",
    lastName: "DUNGALO",
    firstName: "ANNA MARIE",
    middleInitial: "P.",
    sex: "FEMALE",
    purok: "PUROK I",
    dateOfBirth: "JUNE 14, 1988",
    placeOfBirth: "LAPU-LAPU CITY, CEBU",
    civilStatus: "SEPARATED",
    citizenship: "FILIPINO",
    educAttainment: "HIGH SCHOOL GRAD.",
    occupation: "VENDOR",
    age: 37,
    currentAddress: "PUROK I",
    sector: "N/A",
    cr: "RENT",
    house: "RENT",
    waterSource: "COMMUNAL",
    noHouseOfMember: 3,
    previousAddress: [],
  },
  {
    id: "BM1000008",
    lastName: "DUNGALO",
    firstName: "ANNA MARIE",
    middleInitial: "P.",
    sex: "FEMALE",
    purok: "PUROK I",
    dateOfBirth: "APRIL 2, 1970",
    placeOfBirth: "DANAO CITY, CEBU",
    civilStatus: "MARRIED",
    citizenship: "FILIPINO",
    educAttainment: "COLLEGE GRAD.",
    occupation: "ENGINEER",
    age: 56,
    currentAddress: "PUROK I",
    sector: "N/A",
    cr: "OWN",
    house: "OWN",
    waterSource: "INDIVIDUAL",
    noHouseOfMember: 4,
    previousAddress: [{ year: "2010", address: "PUROK II" }],
  },
];

type Resident = (typeof mockResidents)[0];

// ── INFO ROW ──────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wide min-w-[150px] shrink-0">
        {label}
      </span>
      <span className="text-[11px] text-[#374151]">: {value}</span>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ResidentsPage() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Resident>(mockResidents[0]);

  const filtered = mockResidents.filter((r) => {
    const q = search.toLowerCase();
    const full = `${r.lastName}, ${r.firstName} ${r.middleInitial}`.toLowerCase();
    return full.includes(q);
  });

  return (
    <div className="flex min-h-[calc(100vh-124px)] gap-5">

      {/* ── Left: List panel ── */}
      <div className="bg-white rounded-xl border border-[#E9EAEC] flex flex-col w-[320px] shrink-0 overflow-hidden">

        {/* Search bar */}
        <div className="px-4 pt-4 pb-3 flex items-center gap-2 border-b border-[#E9EAEC]">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search Name"
              className="w-full pl-9 pr-3 py-2.5 text-[13px] bg-[#F4F5F7] rounded-xl border border-transparent focus:outline-none focus:border-[#3B82F6] focus:bg-white transition placeholder:text-[#9CA3AF] text-[#1F2937]"
            />
          </div>
          <button className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#F4F5F7] text-[#6B7280] hover:bg-[#E5E7EB] transition shrink-0">
            <SlidersHorizontal size={15} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {filtered.map((r) => {
            const active = selected?.id === r.id;
            const fullName = `${r.lastName}, ${r.firstName} ${r.middleInitial}`;
            return (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left px-4 py-3 flex items-center gap-3 border-b border-[#F4F5F7] transition group
                  ${active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB]"}`}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-[13px] font-bold truncate ${active ? "text-white" : "text-[#1F2937]"}`}>
                    {fullName}
                  </p>
                  <p className={`text-[11px] mt-0.5 ${active ? "text-blue-100" : "text-[#9CA3AF]"}`}>
                    {r.sex}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className={`text-[10px] font-semibold ${active ? "text-blue-100" : "text-[#6B7280]"}`}>
                    {r.purok}
                  </span>
                  <ChevronRight
                    size={14}
                    className={active ? "text-white" : "text-[#D1D5DB]"}
                  />
                </div>
              </button>
            );
          })}
        </div>

        {/* Add button */}
        <div className="p-4 flex justify-end border-t border-[#F4F5F7]">
          <button className="w-10 h-10 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white flex items-center justify-center shadow-md transition">
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* ── Right: Detail panel ── */}
      {selected ? (
        <div className="flex-1 bg-white rounded-xl border border-[#E9EAEC] overflow-y-auto p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-5 pb-4 border-b border-[#E9EAEC]">
            <div>
              <h2 className="text-[15px] font-black text-[#1F2937] uppercase tracking-wide">
                {selected.firstName} {selected.middleInitial} {selected.lastName}
              </h2>
            </div>
            <span className="text-[13px] font-bold text-[#1F2937] uppercase tracking-widest">
              {selected.sex}
            </span>
          </div>

          {/* Personal Info */}
          <div className="mb-5">
            <InfoRow label="RBI ID"            value={selected.id} />
            <InfoRow label="Date of Birth"     value={selected.dateOfBirth} />
            <InfoRow label="Place of Birth"    value={selected.placeOfBirth} />
            <InfoRow label="Civil Status"      value={selected.civilStatus} />
            <InfoRow label="Citizenship"       value={selected.citizenship} />
            <InfoRow label="Educ. Attainment"  value={selected.educAttainment} />
            <InfoRow label="Occupation"        value={selected.occupation} />
            <InfoRow label="Age"               value={selected.age} />
            <InfoRow label="Current Address"   value={selected.currentAddress} />
          </div>

          {/* Other Information */}
          <div className="mb-5 pt-4 border-t border-[#E9EAEC]">
            <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-2">
              Other Information
            </p>
            <InfoRow label="Sector"            value={selected.sector} />
            <InfoRow label="CR"                value={selected.cr} />
            <InfoRow label="House"             value={selected.house} />
            <InfoRow label="Water Source"      value={selected.waterSource} />
            <div className="flex gap-2 py-1 items-center justify-between">
              <div className="flex gap-2">
                <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wide min-w-[150px] shrink-0">
                  No. House of Member
                </span>
                <span className="text-[11px] text-[#374151]">: {selected.noHouseOfMember}</span>
              </div>
              <button className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition uppercase tracking-wide">
                View Member
              </button>
            </div>
          </div>

          {/* Previous Address */}
          {selected.previousAddress.length > 0 && (
            <div className="pt-4 border-t border-[#E9EAEC]">
              <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-2">
                Previous Address
              </p>
              {selected.previousAddress.map((pa, i) => (
                <InfoRow key={i} label={pa.year} value={pa.address} />
              ))}
            </div>
          )}

          {/* More Info */}
          <div className="flex justify-end mt-5 pt-4 border-t border-[#E9EAEC]">
            <button className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition uppercase tracking-wide">
              More Info.
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white rounded-xl border border-[#E9EAEC] flex items-center justify-center">
          <p className="text-[#9CA3AF] text-sm">Select a resident to view details</p>
        </div>
      )}
    </div>
  );
}
