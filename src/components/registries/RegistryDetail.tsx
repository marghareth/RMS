"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, Pencil, Trash2,
  User, Home, Heart, Syringe,
  FileText, CreditCard, BookOpen,
  CalendarDays, MapPin,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  getMockRegistryById,
  deleteMockRegistry,
  type RegistryEntry,
} from "@/lib/mockRegistries";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type RegistryType = "SENIOR_CITIZEN" | "PWD" | "FOUR_PS";

interface RegistryDetailProps {
  entryId:    number;
  title:      string;
  icon:       LucideIcon;
  iconBg:     string;
  accentText: string;
  listBase:   string; // e.g. "/registries/senior-citizens"
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function calcAge(birthdate: string) {
  const today = new Date(); const dob = new Date(birthdate);
  let age = today.getFullYear() - dob.getFullYear();
  if (today.getMonth() - dob.getMonth() < 0 || (today.getMonth() - dob.getMonth() === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase();
}
function fmtShort(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function rbiId(id: number) { return `BM${String(id).padStart(7, "0")}`; }

// ─── INFO ROW ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-1.25">
      <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide min-w-37.5 shrink-0">
        {label}
      </span>
      <span className="text-[11px] font-medium text-[#374151]">: {value ?? "—"}</span>
    </div>
  );
}

// ─── SECTION CARD ─────────────────────────────────────────────────────────────
function SectionCard({ title, icon: Icon, iconBg, children }: {
  title: string; icon: any; iconBg: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] overflow-hidden">
      <div className="flex items-center gap-2.5 px-5 py-3 border-b border-[#E9EAEC]">
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
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${color}`}>
      {label}
    </span>
  );
}

// ─── REGISTRY TYPE BANNER ────────────────────────────────────────────────────
const REGISTRY_CFG: Record<RegistryType, { label: string; bg: string; border: string; text: string }> = {
  SENIOR_CITIZEN: { label: "Senior Citizen", bg: "bg-amber-50",  border: "border-amber-100", text: "text-amber-700"  },
  PWD:            { label: "PWD",            bg: "bg-blue-50",   border: "border-blue-100",  text: "text-blue-700"   },
  FOUR_PS:        { label: "4Ps Beneficiary",bg: "bg-green-50",  border: "border-green-100", text: "text-green-700"  },
};

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function RegistryDetail({
  entryId, title, icon: Icon, iconBg, accentText, listBase,
}: RegistryDetailProps) {
  const router = useRouter();
  // For the mock data we can derive the entry synchronously to avoid
  // calling setState inside an effect (which can cause cascading renders).
  const entry = getMockRegistryById(entryId) ?? null;
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    /* ── Real API (commented out until Supabase is connected) ──────────────────
    fetch(`/api/registries/${entryId}`)
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then(setEntry)
      .catch(() => router.push(listBase))
      .finally(() => setLoading(false));
    ─────────────────────────────────────────────────────────────────────────── */
    // For mock data we derive `entry` synchronously; if not found, navigate away.
    if (!entry) router.push(listBase);
  }, [entry, listBase, router]);

  async function handleDelete() {
    if (!confirm("Remove this resident from the registry? This cannot be undone.")) return;
    setDeleting(true);
    /* ── Real API (commented out) ──────────────────────────────────────────────
    await fetch(`/api/registries/${entryId}`, { method: "DELETE" });
    ─────────────────────────────────────────────────────────────────────────── */
    deleteMockRegistry(entryId);
    router.push(listBase);
  }

  if (!entry) return null;

  const r   = entry.resident;
  const cfg = REGISTRY_CFG[entry.registry_type];
  const displayName = `${r.lname}, ${r.fname}${r.name_extension ? " " + r.name_extension : ""}${r.mname ? " " + r.mname[0] + "." : ""}`;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(listBase)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition"
          >
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
              <Icon size={18} className="text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[17px] font-black text-[#1F2937] uppercase tracking-wide">
                  {displayName}
                </h1>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${cfg.bg} ${cfg.border} ${cfg.text} border`}>
                  {cfg.label}
                </span>
              </div>
              <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                {rbiId(r.id)} · {title} Registry
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(`/residents/${r.id}`)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
          >
            <User size={13} /> View RBI Profile
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-[12px] font-bold hover:bg-red-50 transition disabled:opacity-50"
          >
            <Trash2 size={13} /> Remove
          </button>
        </div>
      </div>

      {/* ── Top banner ── */}
      <div className={`rounded-xl border px-6 py-4 mb-5 grid grid-cols-4 gap-4 ${cfg.bg} ${cfg.border}`}>
        <div>
          <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Registry Type</p>
          <p className={`text-[13px] font-bold mt-0.5 ${cfg.text}`}>{cfg.label}</p>
        </div>
        <div>
          <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Registered On</p>
          <p className={`text-[13px] font-bold mt-0.5 ${cfg.text}`}>{fmtDate(entry.registered_at)}</p>
        </div>
        <div>
          <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Age</p>
          <p className={`text-[13px] font-bold mt-0.5 ${cfg.text}`}>{calcAge(r.birthdate)} years old</p>
        </div>
        {entry.registry_type === "PWD" && (
          <div>
            <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Disability Type</p>
            <p className={`text-[13px] font-bold mt-0.5 ${cfg.text}`}>{entry.disability_type ?? "—"}</p>
          </div>
        )}
        {entry.registry_type === "FOUR_PS" && (
          <div>
            <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>4Ps Status</p>
            <p className={`text-[13px] font-bold mt-0.5 ${cfg.text}`}>
              {entry.is_4ps_beneficiary ? "Active Beneficiary" : "Inactive"}
            </p>
          </div>
        )}
        {entry.registry_type === "SENIOR_CITIZEN" && (
          <div>
            <p className={`text-[9px] font-semibold uppercase tracking-widest opacity-60 ${cfg.text}`}>Date of Birth</p>
            <p className={`text-[13px] font-bold mt-0.5 ${cfg.text}`}>{fmtDate(r.birthdate)}</p>
          </div>
        )}
      </div>

      {/* ── 3-column card grid ── */}
      <div className="grid grid-cols-3 gap-4">

        {/* ── Column 1: Personal ── */}
        <div className="space-y-4">
          <SectionCard title="Personal Information" icon={User} iconBg="bg-[#3B82F6]">
            <InfoRow label="RBI ID"         value={rbiId(r.id)}                />
            <InfoRow label="Date of Birth"  value={fmtDate(r.birthdate)}       />
            <InfoRow label="Place of Birth" value={r.place_of_birth}           />
            <InfoRow label="Sex"            value={r.sex}                      />
            <InfoRow label="Civil Status"   value={r.civil_status.replace("_", "-")} />
            <InfoRow label="Citizenship"    value={r.citizenship}              />
            <InfoRow label="Religion"       value={r.religion}                 />
          </SectionCard>

          <SectionCard title="Socio-Economic" icon={BookOpen} iconBg="bg-purple-500">
            <InfoRow label="Employment"  value={r.employment_status}      />
            <InfoRow label="Education"   value={r.educational_attainment} />
            <InfoRow label="Occupation"  value={r.occupation}             />
            <InfoRow label="Income"      value={r.income_bracket}         />
            <InfoRow label="Sector"      value={r.sector ?? "N/A"}        />
          </SectionCard>
        </div>

        {/* ── Column 2: Address + Certificates ── */}
        <div className="space-y-4">
          <SectionCard title="Address & Household" icon={Home} iconBg="bg-amber-500">
            <InfoRow label="Purok"        value={r.purok?.name}                 />
            <InfoRow label="Household No."value={r.household?.household_no}     />
            <InfoRow label="Address"      value={r.household?.address}          />
            <InfoRow label="Housing Type" value={r.household?.housing_type}     />
            <InfoRow label="Water Source" value={r.household?.water_source}     />
            <InfoRow label="CR"           value={r.household?.comfort_room}     />
            <div className="flex gap-2 py-1.25">
              <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide min-w-1.25 shrink-0">
                No. of Members
              </span>
              <span className="text-[11px] font-medium text-[#374151]">
                : {r.household?.members?.length ?? "—"}
              </span>
            </div>
            {r.household && (
              <button
                onClick={() => router.push(`/households/${r.household!.id}`)}
                className="mt-1 text-[11px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] transition"
              >
                View Household Members →
              </button>
            )}
          </SectionCard>

          <SectionCard title={`Certificates (${r.certificates.length})`} icon={FileText} iconBg="bg-green-500">
            {r.certificates.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">No certificates issued yet</p>
            ) : (
              <div className="space-y-1.5">
                {r.certificates.slice(0, 4).map(c => (
                  <div key={c.id} className="flex items-center justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                    <p className="text-[11px] font-semibold text-[#1F2937] truncate pr-2">
                      {c.certificate_type.replace(/_/g, " ")}
                    </p>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">
                      {fmtShort(c.issued_at)}
                    </span>
                  </div>
                ))}
                {r.certificates.length > 4 && (
                  <p className="text-[10px] text-[#3B82F6] pt-1">+{r.certificates.length - 4} more</p>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title={`Barangay IDs (${r.barangay_ids.length})`} icon={CreditCard} iconBg="bg-[#1F2937]">
            {r.barangay_ids.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">No barangay ID issued</p>
            ) : (
              r.barangay_ids.map(bid => (
                <div key={bid.id} className="flex justify-between py-1.5 border-b border-[#F4F5F7] last:border-0">
                  <p className="text-[12px] font-bold text-[#1F2937]">{bid.id_number}</p>
                  <span className="text-[10px] text-[#9CA3AF]">{fmtShort(bid.issued_date)}</span>
                </div>
              ))
            )}
          </SectionCard>
        </div>

        {/* ── Column 3: Health + Vaccinations ── */}
        <div className="space-y-4">
          <SectionCard title={`Health Records (${r.health_records.length})`} icon={Heart} iconBg="bg-red-500">
            {r.health_records.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">No health records</p>
            ) : (
              <div className="space-y-1.5">
                {r.health_records.slice(0, 5).map(hr => (
                  <div key={hr.id} className="py-1 border-b border-[#F4F5F7] last:border-0">
                    <div className="flex justify-between">
                      <p className="text-[11px] font-semibold text-[#1F2937]">{hr.record_type}</p>
                      <span className="text-[10px] text-[#9CA3AF]">{fmtShort(hr.recorded_at)}</span>
                    </div>
                    {hr.notes && <p className="text-[10px] text-[#9CA3AF] mt-0.5 truncate">{hr.notes}</p>}
                  </div>
                ))}
                {r.health_records.length > 5 && (
                  <p className="text-[10px] text-[#3B82F6] pt-1">+{r.health_records.length - 5} more</p>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard title={`Vaccinations (${r.vaccinations.length})`} icon={Syringe} iconBg="bg-[#3B82F6]">
            {r.vaccinations.length === 0 ? (
              <p className="text-[11px] text-[#9CA3AF] py-1">No vaccination records</p>
            ) : (
              <div className="space-y-1.5">
                {r.vaccinations.slice(0, 5).map(v => (
                  <div key={v.id} className="flex justify-between py-1 border-b border-[#F4F5F7] last:border-0">
                    <p className="text-[11px] font-semibold text-[#1F2937] truncate pr-2">{v.vaccine_name}</p>
                    <span className="text-[10px] text-[#9CA3AF] shrink-0">{fmtShort(v.date_given)}</span>
                  </div>
                ))}
                {r.vaccinations.length > 5 && (
                  <p className="text-[10px] text-[#3B82F6] pt-1">+{r.vaccinations.length - 5} more</p>
                )}
              </div>
            )}
          </SectionCard>

          {/* Registry metadata */}
          <SectionCard title="Registry Info" icon={CalendarDays} iconBg="bg-teal-500">
            <InfoRow label="Registry Type"  value={cfg.label}                />
            <InfoRow label="Registered On"  value={fmtDate(entry.registered_at)} />
            {entry.disability_type && (
              <InfoRow label="Disability" value={entry.disability_type} />
            )}
            {entry.registry_type === "FOUR_PS" && (
              <InfoRow label="4Ps Status" value={entry.is_4ps_beneficiary ? "Active" : "Inactive"} />
            )}
          </SectionCard>
        </div>
      </div>

      {/* ── Footer ── */}
      <div className="mt-4 flex items-center justify-end">
        <button
          onClick={() => router.push(`/residents/${r.id}`)}
          className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[12px] font-bold transition shadow-sm"
        >
          <User size={13} /> View Full RBI Profile
        </button>
      </div>
    </div>
  );
}