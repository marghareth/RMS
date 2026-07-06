"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Pencil, Archive,
  User, Home, Heart, Syringe,
  FileText, CreditCard, BookOpen,
} from "lucide-react";
import { getMockResidents, type Resident as MockResident } from "@/lib/mockResidents";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface Resident extends MockResident {}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function calcAge(birthdate: string) {
  const today = new Date(); const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}
function rbiId(id: number) { return `BM${String(id).padStart(7, "0")}`; }

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, valueClass }: {
  label: string; value?: string | number | null; valueClass?: string;
}) {
  return (
    <div className="flex gap-2 py-1.25">
      <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide min-w-38.75 shrink-0">
        {label}
      </span>
      <span className={`text-[11px] font-medium ${valueClass ?? "text-[#374151]"}`}>
        : {value ?? "—"}
      </span>
    </div>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({
  title, icon: Icon, iconBg, children,
}: {
  title: string; icon: any; iconBg: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
      <div className={`flex items-center gap-2.5 px-5 py-3 border-b border-[#E9EAEC]`}>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
          <Icon size={13} className="text-white" />
        </div>
        <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">{title}</p>
      </div>
      <div className="px-5 py-3">{children}</div>
    </div>
  );
}

// ─── BADGE ───────────────────────────────────────────────────────────────────
function Badge({ label, color = "blue" }: { label: string; color?: "blue"|"green"|"amber"|"red"|"gray" }) {
  const cls = {
    blue:  "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red:   "bg-red-100 text-red-700",
    gray:  "bg-gray-100 text-gray-700",
  }[color];
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cls}`}>{label}</span>;
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function ResidentDetailPage() {
  const router  = useRouter();
  const { id }  = useParams<{ id: string }>();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    /* ── Real API (commented out until Supabase is connected) ──────────────────
    fetch(`/api/residents/${id}`)
      .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
      .then(setResident)
      .catch(() => router.push("/residents"))
      .finally(() => setLoading(false));
    ─────────────────────────────────────────────────────────────────────────── */
    const found = getMockResidents().find(item => String(item.id) === String(id));
    // eslint-disable-next-line react-hooks/set-state-in-effect
    found ? setResident(found) : router.push("/residents");
    setLoading(false);
  }, [id, router]);

  async function handleArchive() {
    if (!confirm("Archive this resident? They will be hidden from the main list.")) return;
    setArchiving(true);
    // await fetch(`/api/residents/${id}`, { method: "DELETE" });
    router.push("/residents");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-7 h-7 border-2 border-[#3B82F6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }
  if (!resident) return null;

  const displayName = `${resident.lname}, ${resident.fname}${resident.name_extension ? " " + resident.name_extension : ""}${resident.mname ? " " + resident.mname[0] + "." : ""}`;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/residents")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition"
          >
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">
                {displayName}
              </h1>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide
                ${resident.sex === "MALE" ? "bg-blue-100 text-blue-700" : "bg-pink-100 text-pink-600"}`}>
                {resident.sex}
              </span>
              {resident.is_archived && <Badge label="Archived" color="red" />}
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              {rbiId(resident.id)} · Age {calcAge(resident.birthdate)} · {resident.purok?.name ?? "—"}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/residents/${id}/edit`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
          >
            <Pencil size={13} /> Edit
          </button>
          {!resident.is_archived && (
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-[12px] font-bold hover:bg-red-50 transition disabled:opacity-50"
            >
              <Archive size={13} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* ── Top info strip ── */}
      <div className="bg-[#3B82F6] rounded-xl px-6 py-4 mb-5 grid grid-cols-4 gap-4 text-white">
        {[
          { label: "RBI ID",        value: rbiId(resident.id)                                },
          { label: "Date of Birth", value: formatDate(resident.birthdate)                    },
          { label: "Place of Birth",value: resident.place_of_birth ?? "—"                    },
          { label: "Civil Status",  value: resident.civil_status.replace("_", "-")           },
        ].map(item => (
          <div key={item.label}>
            <p className="text-[9px] font-semibold uppercase tracking-widest opacity-70">{item.label}</p>
            <p className="text-[12px] font-bold mt-0.5">{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── 3-column grid ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* ── Column 1 ── */}
        <div className="space-y-4">

          {/* Personal */}
          <SectionCard title="Personal Information" icon={User} iconBg="bg-[#3B82F6]">
            <InfoRow label="Citizenship"    value={resident.citizenship}  />
            <InfoRow label="Nationality"    value={resident.nationality}  />
            <InfoRow label="Religion"       value={resident.religion}     />
          </SectionCard>

          {/* Socio-economic */}
          <SectionCard title="Socio-Economic" icon={BookOpen} iconBg="bg-purple-500">
            <InfoRow label="Employment"   value={resident.employment_status}      />
            <InfoRow label="Education"    value={resident.educational_attainment} />
            <InfoRow label="Occupation"   value={resident.occupation}             />
            <InfoRow label="Income"       value={resident.income_bracket}         />
            <InfoRow label="Sector"       value={resident.sector ?? "N/A"}        />
          </SectionCard>
        </div>

        {/* ── Column 2 ── */}
        <div className="space-y-4">

          {/* Other Information */}
          <SectionCard title="Other Information" icon={Home} iconBg="bg-amber-500">
            <InfoRow label="Sector"          value={resident.sector ?? "N/A"}               />
            <InfoRow label="CR"              value={resident.household?.comfort_room}        />
            <InfoRow label="House"           value={resident.household?.housing_type}        />
            <InfoRow label="Water Source"    value={resident.household?.water_source}        />
            <div className="flex items-center justify-between py-1.25">
              <div className="flex gap-2">
                <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide min-w-38.75 shrink-0">
                  No. House of Member
                </span>
                <span className="text-[11px] font-medium text-[#374151]">
                  : {resident.household?.members?.length ?? "—"}
                </span>
              </div>
              {resident.household && (
                <button
                  onClick={() => router.push(`/households/${resident.household!.id}`)}
                  className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] uppercase tracking-wide transition shrink-0"
                >
                  View Member
                </button>
              )}
            </div>
          </SectionCard>

          {/* Certificates */}
          <SectionCard title={`Certificates (${resident.certificates.length})`} icon={FileText} iconBg="bg-green-500">
            {resident.certificates.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">No certificates issued yet</p>
            ) : (
              <div className="space-y-1.5">
                {resident.certificates.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                    <p className="text-[11px] font-semibold text-[#1F2937] truncate pr-2">
                      {c.certificate_type.replace(/_/g, " ")}
                    </p>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">
                      {new Date(c.issued_at).toLocaleDateString()}
                    </span>
                  </div>
                ))}
                {resident.certificates.length > 4 && (
                  <p className="text-[10px] text-[#3B82F6] pt-1">+{resident.certificates.length - 4} more</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Barangay IDs */}
          <SectionCard title={`Barangay IDs (${resident.barangay_ids.length})`} icon={CreditCard} iconBg="bg-[#1F2937]">
            {resident.barangay_ids.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">No barangay ID issued</p>
            ) : (
              resident.barangay_ids.map(bid => (
                <div key={bid.id} className="flex justify-between py-1.5 border-b border-[#F4F5F7] last:border-0">
                  <p className="text-[12px] font-bold text-[#1F2937]">{bid.id_number}</p>
                  <span className="text-[10px] text-[#9CA3AF]">{new Date(bid.issued_date).toLocaleDateString()}</span>
                </div>
              ))
            )}
          </SectionCard>
        </div>

        {/* ── Column 3 ── */}
        <div className="space-y-4">

          {/* Special Registries */}
          <SectionCard title="Special Registries" icon={BookOpen} iconBg="bg-teal-500">
            {resident.special_registries.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">Not in any special registry</p>
            ) : (
              <div className="flex flex-wrap gap-2 pt-1">
                {resident.special_registries.map(sr => (
                  <div key={sr.id} className="flex items-center gap-1">
                    <Badge
                      label={sr.registry_type === "FOUR_PS" ? "4Ps" : sr.registry_type.replace("_", " ")}
                      color={sr.registry_type === "SENIOR_CITIZEN" ? "amber" : sr.registry_type === "PWD" ? "blue" : "green"}
                    />
                    {sr.disability_type && (
                      <span className="text-[10px] text-[#9CA3AF]">({sr.disability_type})</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* Health Records */}
          <SectionCard title={`Health Records (${resident.health_records.length})`} icon={Heart} iconBg="bg-red-500">
            {resident.health_records.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">No health records</p>
            ) : (
              <div className="space-y-1.5">
                {resident.health_records.slice(0, 4).map(hr => (
                  <div key={hr.id} className="py-1 border-b border-[#F4F5F7] last:border-0">
                    <div className="flex justify-between">
                      <p className="text-[11px] font-semibold text-[#1F2937]">{hr.record_type}</p>
                      <span className="text-[10px] text-[#9CA3AF]">{new Date(hr.recorded_at).toLocaleDateString()}</span>
                    </div>
                    {hr.notes && <p className="text-[10px] text-[#9CA3AF] mt-0.5 truncate">{hr.notes}</p>}
                  </div>
                ))}
                {resident.health_records.length > 4 && (
                  <p className="text-[10px] text-[#3B82F6] pt-1">+{resident.health_records.length - 4} more</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Vaccinations */}
          <SectionCard title={`Vaccinations (${resident.vaccinations.length})`} icon={Syringe} iconBg="bg-[#3B82F6]">
            {resident.vaccinations.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">No vaccination records</p>
            ) : (
              <div className="space-y-1.5">
                {resident.vaccinations.slice(0, 5).map(v => (
                  <div key={v.id} className="flex justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                    <p className="text-[11px] font-semibold text-[#1F2937] truncate pr-2">{v.vaccine_name}</p>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">{new Date(v.date_given).toLocaleDateString()}</span>
                  </div>
                ))}
                {resident.vaccinations.length > 5 && (
                  <p className="text-[10px] text-[#3B82F6] pt-1">+{resident.vaccinations.length - 5} more</p>
                )}
              </div>
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Footer meta ── */}
      <div className="mt-4 flex items-center justify-between">
        <div className="flex gap-4">
          <span className="text-[10px] text-[#9CA3AF]">
            Registered: {new Date(resident.created_at).toLocaleDateString()}
          </span>
          <span className="text-[10px] text-[#9CA3AF]">
            Last updated: {new Date(resident.updated_at).toLocaleDateString()}
          </span>
        </div>
        <button
          onClick={() => router.push(`/residents/${id}/edit`)}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[12px] font-bold transition shadow-sm"
        >
          <Pencil size={13} /> Edit Resident
        </button>
      </div>
    </div>
  );
}