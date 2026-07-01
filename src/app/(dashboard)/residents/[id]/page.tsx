"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Pencil, Archive } from "lucide-react";
import { getMockResidents, type Resident as MockResident } from "@/lib/mockResidents";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Purok     { id: number; name: string }
interface Household {
  id: number; household_no: string; address: string;
  housing_type: string | null; water_source: string | null; comfort_room: string | null;
  members: Resident[];
}
interface Certificate { id: number; certificate_type: string; purpose: string; issued_at: string }
interface SpecialRegistry { id: number; registry_type: string; disability_type: string | null }
interface HealthRecord { id: number; record_type: string; notes: string | null; recorded_at: string }
interface Vaccination { id: number; vaccine_name: string; date_given: string }
interface BarangayId  { id: number; id_number: string; issued_date: string }

interface Resident extends MockResident {}

// ── HELPERS ───────────────────────────────────────────────────────────────────
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

// ── SECTION ───────────────────────────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
      <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-3">{title}</p>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-1">
      <span className="text-[11px] font-semibold text-[#374151] uppercase tracking-wide min-w-45 shrink-0">{label}</span>
      <span className="text-[11px] text-[#374151]">: {value ?? "—"}</span>
    </div>
  );
}

function Badge({ label, color = "blue" }: { label: string; color?: "blue" | "green" | "amber" | "red" }) {
  const cls = {
    blue:  "bg-blue-100 text-blue-700",
    green: "bg-green-100 text-green-700",
    amber: "bg-amber-100 text-amber-700",
    red:   "bg-red-100 text-red-700",
  }[color];
  return <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cls}`}>{label}</span>;
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function ResidentDetailPage() {
  const router    = useRouter();
  const { id }    = useParams<{ id: string }>();
  const [resident, setResident] = useState<Resident | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [archiving, setArchiving] = useState(false);

  useEffect(() => {
    // fetch(`/api/residents/${id}`)
    //   .then(r => { if (!r.ok) throw new Error("Not found"); return r.json(); })
    //   .then(setResident)
    //   .catch(() => router.push("/residents"))
    //   .finally(() => setLoading(false));

    const found = getMockResidents().find((item) => String(item.id) === String(id));
    if (found) {
      setResident(found);
    } else {
      router.push("/residents");
    }
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

  const displayName = `${resident.fname}${resident.name_extension ? " " + resident.name_extension : ""} ${resident.mname ? resident.mname[0] + ". " : ""}${resident.lname}`;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/residents")}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition"
          >
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div>
            <h1 className="text-[16px] font-black text-[#1F2937] uppercase tracking-wide">{displayName}</h1>
            <p className="text-[11px] text-[#9CA3AF]">{rbiId(resident.id)} · {resident.sex}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {resident.is_archived && <Badge label="Archived" color="red" />}
          <button
            onClick={() => router.push(`/residents/${id}/edit`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] transition"
          >
            <Pencil size={13} /> Edit
          </button>
          {!resident.is_archived && (
            <button
              onClick={handleArchive}
              disabled={archiving}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg border border-red-200 text-red-500 text-[12px] font-bold hover:bg-red-50 transition"
            >
              <Archive size={13} /> Archive
            </button>
          )}
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-2 gap-5">

        {/* Personal Information */}
        <Section title="Personal Information">
          <Row label="RBI ID"            value={rbiId(resident.id)} />
          <Row label="Date of Birth"     value={formatDate(resident.birthdate)} />
          <Row label="Place of Birth"    value={resident.place_of_birth} />
          <Row label="Age"               value={calcAge(resident.birthdate)} />
          <Row label="Sex"               value={resident.sex} />
          <Row label="Civil Status"      value={resident.civil_status.replace("_", "-")} />
          <Row label="Citizenship"       value={resident.citizenship} />
          <Row label="Nationality"       value={resident.nationality} />
          <Row label="Religion"          value={resident.religion} />
        </Section>

        {/* Socio-economic */}
        <Section title="Socio-Economic">
          <Row label="Educ. Attainment"  value={resident.educational_attainment} />
          <Row label="Employment Status" value={resident.employment_status} />
          <Row label="Occupation"        value={resident.occupation} />
          <Row label="Income Bracket"    value={resident.income_bracket} />
          <Row label="Sector"            value={resident.sector ?? "N/A"} />
        </Section>

        {/* Address */}
        <Section title="Address">
          <Row label="Current Purok"     value={resident.purok?.name} />
          <Row label="Household No."     value={resident.household?.household_no} />
          <Row label="House Address"     value={resident.household?.address} />
          <Row label="Housing Type"      value={resident.household?.housing_type} />
          <Row label="Water Source"      value={resident.household?.water_source} />
          <Row label="Comfort Room"      value={resident.household?.comfort_room} />
          {resident.household && (
            <div className="mt-2">
              <button
                onClick={() => router.push(`/households/${resident.household!.id}`)}
                className="text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] uppercase tracking-wide"
              >
                View All Household Members ({resident.household.members?.length ?? 0})
              </button>
            </div>
          )}
        </Section>

        {/* Special Registries */}
        <Section title="Special Registries">
          {resident.special_registries.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF]">Not in any special registry</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {resident.special_registries.map(sr => (
                <div key={sr.id}>
                  <Badge
                    label={sr.registry_type === "FOUR_PS" ? "4Ps" : sr.registry_type.replace("_", " ")}
                    color={sr.registry_type === "SENIOR_CITIZEN" ? "amber" : sr.registry_type === "PWD" ? "blue" : "green"}
                  />
                  {sr.disability_type && (
                    <span className="text-[10px] text-[#6B7280] ml-1">({sr.disability_type})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Certificates */}
        <Section title={`Certificates Issued (${resident.certificates.length})`}>
          {resident.certificates.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF]">No certificates issued yet</p>
          ) : (
            <div className="space-y-2">
              {resident.certificates.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                  <div>
                    <p className="text-[12px] font-semibold text-[#1F2937]">
                      {c.certificate_type.replace(/_/g, " ")}
                    </p>
                    <p className="text-[10px] text-[#9CA3AF]">{c.purpose}</p>
                  </div>
                  <span className="text-[10px] text-[#6B7280] shrink-0 ml-2">
                    {new Date(c.issued_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Vaccinations */}
        <Section title={`Vaccinations (${resident.vaccinations.length})`}>
          {resident.vaccinations.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF]">No vaccination records</p>
          ) : (
            <div className="space-y-2">
              {resident.vaccinations.map(v => (
                <div key={v.id} className="flex items-center justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                  <p className="text-[12px] font-semibold text-[#1F2937]">{v.vaccine_name}</p>
                  <span className="text-[10px] text-[#6B7280]">
                    {new Date(v.date_given).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Health Records */}
        <Section title={`Health Records (${resident.health_records.length})`}>
          {resident.health_records.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF]">No health records</p>
          ) : (
            <div className="space-y-2">
              {resident.health_records.slice(0, 5).map(hr => (
                <div key={hr.id} className="py-1 border-b border-[#F4F5F7] last:border-0">
                  <div className="flex justify-between">
                    <p className="text-[12px] font-semibold text-[#1F2937]">{hr.record_type}</p>
                    <span className="text-[10px] text-[#6B7280]">
                      {new Date(hr.recorded_at).toLocaleDateString()}
                    </span>
                  </div>
                  {hr.notes && <p className="text-[11px] text-[#6B7280] mt-0.5">{hr.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* Barangay IDs */}
        <Section title={`Barangay IDs (${resident.barangay_ids.length})`}>
          {resident.barangay_ids.length === 0 ? (
            <p className="text-[12px] text-[#9CA3AF]">No barangay ID issued</p>
          ) : (
            <div className="space-y-2">
              {resident.barangay_ids.map(bid => (
                <div key={bid.id} className="flex justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                  <p className="text-[12px] font-semibold text-[#1F2937]">{bid.id_number}</p>
                  <span className="text-[10px] text-[#6B7280]">
                    {new Date(bid.issued_date).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Section>

      </div>

      {/* Footer meta */}
      <div className="mt-5 flex justify-end gap-4">
        <span className="text-[10px] text-[#9CA3AF]">
          Registered: {new Date(resident.created_at).toLocaleDateString()}
        </span>
        <span className="text-[10px] text-[#9CA3AF]">
          Last updated: {new Date(resident.updated_at).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}