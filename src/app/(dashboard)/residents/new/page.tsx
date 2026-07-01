"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";

// ── TYPES ─────────────────────────────────────────────────────────────────────
interface Purok { id: number; name: string }

interface MemberDraft {
  _key:                  string; // temp client key
  fname:                 string;
  lname:                 string;
  mname:                 string;
  name_extension:        string;
  birthdate:             string;
  place_of_birth:        string;
  sex:                   string;
  civil_status:          string;
  citizenship:           string;
  educational_attainment: string;
  occupation:            string;
  sector:                string;
}

interface HouseholdDraft {
  address:      string;
  purok_id:     string;
  housing_type: string;
  water_source: string;
  comfort_room: string;
}

const EMPTY_MEMBER: Omit<MemberDraft, "_key"> = {
  fname: "", lname: "", mname: "", name_extension: "",
  birthdate: "", place_of_birth: "", sex: "", civil_status: "",
  citizenship: "Filipino", educational_attainment: "", occupation: "", sector: "",
};

// ── SELECT FIELD ──────────────────────────────────────────────────────────────
function SelectField({
  label, value, onChange, options, required,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none text-[13px] bg-white border border-[#E9EAEC] rounded-xl px-4 py-3 focus:outline-none focus:border-[#3B82F6] text-[#1F2937] pr-8"
        >
          <option value="">SELECT</option>
          {options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[10px]">▼</span>
      </div>
    </div>
  );
}

// ── TEXT FIELD ────────────────────────────────────────────────────────────────
function TextField({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="text-[13px] bg-white border border-[#E9EAEC] rounded-xl px-4 py-3 focus:outline-none focus:border-[#3B82F6] placeholder:text-[#D1D5DB] text-[#1F2937]"
      />
    </div>
  );
}

// ── CONFIRM MODAL ─────────────────────────────────────────────────────────────
function ConfirmMemberModal({
  member, onSave, onCancel,
}: {
  member: Omit<MemberDraft, "_key">;
  onSave: () => void;
  onCancel: () => void;
}) {
  const rows: [string, string][] = [
    ["Name", `${member.fname} ${member.mname ? member.mname + " " : ""}${member.lname}${member.name_extension ? " " + member.name_extension : ""}`],
    ["Date of Birth", member.birthdate ? new Date(member.birthdate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }).toUpperCase() : "—"],
    ["Place of Birth", member.place_of_birth || "—"],
    ["Civil Status", member.civil_status || "—"],
    ["Citizenship", member.citizenship || "—"],
    ["Educ. Attainment", member.educational_attainment || "—"],
    ["Occupation", member.occupation || "—"],
    ["Sector", member.sector || "—"],
  ];

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8">
        <h3 className="text-[15px] font-black text-[#1F2937] uppercase tracking-wide mb-6">
          Member Information
        </h3>
        <div className="space-y-3">
          {rows.map(([label, value]) => (
            <div key={label}>
              <p className="text-[10px] font-bold text-[#1F2937] uppercase tracking-wide">{label}</p>
              <p className="text-[13px] text-[#374151]">{value}</p>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-6 mt-8">
          <button
            onClick={onCancel}
            className="text-[13px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] uppercase tracking-wide"
          >
            CANCEL
          </button>
          <button
            onClick={onSave}
            className="text-[13px] font-bold text-[#3B82F6] hover:text-[#1D4ED8] uppercase tracking-wide"
          >
            SAVE
          </button>
        </div>
      </div>
    </div>
  );
}

// ── AMBER BUTTON ──────────────────────────────────────────────────────────────
function AmberBtn({ children, onClick, type = "button" }: { children: React.ReactNode; onClick?: () => void; type?: "button" | "submit" }) {
  return (
    <button
      type={type}
      onClick={onClick}
      className="flex-1 py-3.5 rounded-full bg-[#F59E0B] hover:bg-[#D97706] text-white font-bold text-[14px] uppercase tracking-wide transition"
    >
      {children}
    </button>
  );
}

function BlueBtn({ children, onClick, disabled }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex-1 py-3.5 rounded-full bg-[#3B82F6] hover:bg-[#2563EB] disabled:opacity-50 text-white font-bold text-[14px] uppercase tracking-wide transition"
    >
      {children}
    </button>
  );
}

// ── STEP INDICATOR ────────────────────────────────────────────────────────────
function StepBar({ step }: { step: number }) {
  const steps = ["General Info", "Members", "Review"];
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((label, i) => {
        const idx = i + 1;
        const active = step === idx;
        const done   = step > idx;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 ${active ? "opacity-100" : "opacity-40"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold
                ${done || active ? "bg-[#3B82F6] text-white" : "bg-[#E9EAEC] text-[#6B7280]"}`}>
                {idx}
              </div>
              <span className="text-[12px] font-semibold text-[#1F2937] hidden sm:block">{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 ${step > idx ? "bg-[#3B82F6]" : "bg-[#E9EAEC]"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function NewRBIPage() {
  const router = useRouter();

  const [step,        setStep]        = useState(1);
  const [puroks,      setPuroks]      = useState<Purok[]>([]);
  const [submitting,  setSubmitting]  = useState(false);
  const [error,       setError]       = useState("");
  const [editIdx,     setEditIdx]     = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Step 1: Household
  const [hh, setHH] = useState<HouseholdDraft>({
    address: "", purok_id: "", housing_type: "", water_source: "", comfort_room: "",
  });
  const setHHField = (k: keyof HouseholdDraft, v: string) => setHH(p => ({ ...p, [k]: v }));

  // Step 2: Members
  const [members, setMembers] = useState<MemberDraft[]>([]);
  const [form,    setForm]    = useState({ ...EMPTY_MEMBER });
  const setField = (k: keyof typeof EMPTY_MEMBER, v: string) => setForm(p => ({ ...p, [k]: v }));

  // Household number preview (will be generated server-side)
  const [hhNoPreview] = useState("HHNP1XXXXXXXXX");

  useEffect(() => {
    fetch("/api/puroks")
      .then(r => r.json())
      .then(setPuroks)
      .catch(console.error);
  }, []);

  // ── Step 1 validation ────────────────────────────────────────────────────
  const step1Valid = hh.address.trim() && hh.purok_id && hh.housing_type && hh.water_source && hh.comfort_room;

  // ── Member form helpers ──────────────────────────────────────────────────
  const memberFormValid = form.fname && form.lname && form.birthdate && form.sex && form.civil_status;

  function handleAddClick() {
    if (!memberFormValid) { setError("Please fill in required member fields."); return; }
    setError("");
    setShowConfirm(true);
  }

  function handleConfirmSave() {
    if (editIdx !== null) {
      setMembers(prev => prev.map((m, i) => i === editIdx ? { ...form, _key: m._key } : m));
      setEditIdx(null);
    } else {
      setMembers(prev => [...prev, { ...form, _key: crypto.randomUUID() }]);
    }
    setForm({ ...EMPTY_MEMBER });
    setShowConfirm(false);
  }

  function handleEditMember(idx: number) {
    const m = members[idx];
    setForm({ ...m });
    setEditIdx(idx);
  }

  function handleDeleteMember(idx: number) {
    setMembers(prev => prev.filter((_, i) => i !== idx));
  }

  function handleClearForm() {
    setForm({ ...EMPTY_MEMBER });
    setEditIdx(null);
    setError("");
  }

  // ── Final submit ─────────────────────────────────────────────────────────
  async function handleFinish() {
    if (members.length === 0) { setError("Please add at least one household member."); return; }
    setSubmitting(true);
    setError("");

    try {
      // 1. Create household
      const hhRes = await fetch("/api/households", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address:      hh.address,
          purok_id:     parseInt(hh.purok_id),
          housing_type: hh.housing_type,
          water_source: hh.water_source,
          comfort_room: hh.comfort_room,
        }),
      });

      if (!hhRes.ok) throw new Error("Failed to create household");
      const household = await hhRes.json();

      // 2. Create each member
      const created: number[] = [];
      for (const m of members) {
        const rRes = await fetch("/api/residents", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fname:                  m.fname,
            lname:                  m.lname,
            mname:                  m.mname  || null,
            name_extension:         m.name_extension || null,
            birthdate:              m.birthdate,
            place_of_birth:         m.place_of_birth || null,
            sex:                    m.sex,
            civil_status:           m.civil_status,
            citizenship:            m.citizenship || "Filipino",
            educational_attainment: m.educational_attainment || null,
            occupation:             m.occupation || null,
            sector:                 m.sector || null,
            purok_id:               parseInt(hh.purok_id),
            household_id:           household.id,
          }),
        });

        if (rRes.status === 409) {
          const dup = await rRes.json();
          setError(`Duplicate detected: ${m.fname} ${m.lname} already exists in the system.`);
          setSubmitting(false);
          return;
        }

        if (!rRes.ok) throw new Error(`Failed to create resident: ${m.fname} ${m.lname}`);
        const r = await rRes.json();
        created.push(r.id);
      }

      // 3. Set first member as household head
      if (created.length > 0) {
        await fetch(`/api/households/${household.id}`, {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ household_head_id: created[0] }),
        });
      }

      router.push("/residents");
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F4F5F7]">

      {/* Top bar */}
      <div className="bg-[#3B82F6] px-6 py-4 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(s => s - 1) : router.push("/residents")}>
          <ArrowLeft size={20} className="text-white" />
        </button>
        <span className="text-white font-bold text-[16px] uppercase tracking-wide">New RBI</span>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <StepBar step={step} />

        {/* ── STEP 1: General Information ── */}
        {step === 1 && (
          <div>
            <h2 className="text-[15px] font-black text-[#1F2937] uppercase tracking-widest text-center mb-6">
              General Information
            </h2>
            <div className="bg-white rounded-2xl border border-[#E9EAEC] p-6 space-y-4">

              {/* Household No. (read-only preview) */}
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Household No.
                </label>
                <input
                  readOnly
                  value={hhNoPreview}
                  className="text-[13px] bg-[#F4F5F7] border border-[#E9EAEC] rounded-xl px-4 py-3 text-[#9CA3AF] cursor-not-allowed"
                />
              </div>

              <TextField
                label="House Address"
                value={hh.address}
                onChange={v => setHHField("address", v)}
                placeholder="House No./Street"
                required
              />

              <SelectField
                label="Purok"
                value={hh.purok_id}
                onChange={v => setHHField("purok_id", v)}
                options={puroks.map(p => ({ value: String(p.id), label: p.name }))}
                required
              />

              <SelectField
                label="Housing Type"
                value={hh.housing_type}
                onChange={v => setHHField("housing_type", v)}
                options={[
                  { value: "OWN",      label: "Own" },
                  { value: "RENT",     label: "Rent" },
                  { value: "SHARED",   label: "Shared" },
                  { value: "INFORMAL", label: "Informal Settler" },
                ]}
                required
              />

              <SelectField
                label="Water Source"
                value={hh.water_source}
                onChange={v => setHHField("water_source", v)}
                options={[
                  { value: "INDIVIDUAL", label: "Individual" },
                  { value: "COMMUNAL",   label: "Communal" },
                  { value: "WELL",       label: "Well" },
                  { value: "OTHER",      label: "Other" },
                ]}
                required
              />

              <SelectField
                label="Comfort Room"
                value={hh.comfort_room}
                onChange={v => setHHField("comfort_room", v)}
                options={[
                  { value: "OWN",    label: "Own" },
                  { value: "SHARED", label: "Shared" },
                  { value: "NONE",   label: "None" },
                ]}
                required
              />
            </div>

            <div className="flex gap-3 mt-6">
              <AmberBtn onClick={() => { if (step1Valid) { setError(""); setStep(2); } else { setError("Please fill in all required fields."); } }}>
                Continue
              </AmberBtn>
            </div>
            {error && <p className="text-red-500 text-[12px] mt-3 text-center">{error}</p>}
          </div>
        )}

        {/* ── STEP 2: House Member Information ── */}
        {step === 2 && (
          <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] text-[#6B7280] font-semibold uppercase">
                Household No.: {hhNoPreview}
              </span>
              <h2 className="text-[15px] font-black text-[#1F2937] uppercase tracking-widest">
                House Member Information
              </h2>
              <span className="text-[12px] font-bold text-[#3B82F6] uppercase">
                No. of Household Member: {members.length}
              </span>
            </div>

            {/* Member Form */}
            <div className="bg-white rounded-2xl border border-[#E9EAEC] p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <TextField label="Last Name"   value={form.lname}  onChange={v => setField("lname",  v)} required />
                <TextField label="First Name"  value={form.fname}  onChange={v => setField("fname",  v)} required />
                <TextField label="Middle Name" value={form.mname}  onChange={v => setField("mname",  v)} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <SelectField
                  label="Name Extension"
                  value={form.name_extension}
                  onChange={v => setField("name_extension", v)}
                  options={[
                    { value: "Jr.", label: "Jr." },
                    { value: "Sr.", label: "Sr." },
                    { value: "II",  label: "II"  },
                    { value: "III", label: "III" },
                    { value: "IV",  label: "IV"  },
                  ]}
                />
                <TextField label="Date of Birth" value={form.birthdate} onChange={v => setField("birthdate", v)} type="date" required />
                <SelectField
                  label="Gender"
                  value={form.sex}
                  onChange={v => setField("sex", v)}
                  options={[{ value: "MALE", label: "Male" }, { value: "FEMALE", label: "Female" }]}
                  required
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <TextField label="Place of Birth" value={form.place_of_birth} onChange={v => setField("place_of_birth", v)} placeholder="Place of Birth" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <SelectField
                  label="Civil Status"
                  value={form.civil_status}
                  onChange={v => setField("civil_status", v)}
                  options={[
                    { value: "SINGLE",    label: "Single"    },
                    { value: "MARRIED",   label: "Married"   },
                    { value: "WIDOWED",   label: "Widowed"   },
                    { value: "SEPARATED", label: "Separated" },
                    { value: "LIVE_IN",   label: "Live-in"   },
                  ]}
                  required
                />
                <SelectField
                  label="Citizenship"
                  value={form.citizenship}
                  onChange={v => setField("citizenship", v)}
                  options={[{ value: "Filipino", label: "Filipino" }, { value: "Dual", label: "Dual" }, { value: "Foreign", label: "Foreign" }]}
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <SelectField
                  label="Educational Attainment"
                  value={form.educational_attainment}
                  onChange={v => setField("educational_attainment", v)}
                  options={[
                    { value: "NO FORMAL",     label: "No Formal Education" },
                    { value: "ELEM.",         label: "Elementary"          },
                    { value: "HIGH SCHOOL",   label: "High School"         },
                    { value: "COLLEGE UNDERGRAD.", label: "College Undergrad." },
                    { value: "COLLEGE GRAD.", label: "College Grad."       },
                    { value: "POST GRAD.",    label: "Post Graduate"       },
                    { value: "VOCATIONAL",    label: "Vocational"          },
                  ]}
                />
                <SelectField
                  label="Occupation"
                  value={form.occupation}
                  onChange={v => setField("occupation", v)}
                  options={[
                    { value: "EMPLOYED",   label: "Employed"   },
                    { value: "STUDENT",    label: "Student"    },
                    { value: "TEACHER",    label: "Teacher"    },
                    { value: "POLICE",     label: "Police"     },
                    { value: "FARMER",     label: "Farmer"     },
                    { value: "VENDOR",     label: "Vendor"     },
                    { value: "NURSE",      label: "Nurse"      },
                    { value: "HOUSEWIFE",  label: "Housewife"  },
                    { value: "UNEMPLOYED", label: "Unemployed" },
                    { value: "OTHER",      label: "Other"      },
                  ]}
                />
                <SelectField
                  label="Sector"
                  value={form.sector}
                  onChange={v => setField("sector", v)}
                  options={[
                    { value: "SENIOR", label: "Senior Citizen" },
                    { value: "PWD",    label: "PWD"            },
                    { value: "YOUTH",  label: "Youth"          },
                    { value: "4PS",    label: "4Ps Beneficiary" },
                    { value: "N/A",    label: "N/A"            },
                  ]}
                />
              </div>

              {error && <p className="text-red-500 text-[12px]">{error}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={handleClearForm}
                  className="px-8 py-2.5 rounded-xl border border-[#E9EAEC] text-[13px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
                >
                  CLEAR
                </button>
                <button
                  onClick={handleAddClick}
                  className="px-8 py-2.5 rounded-xl bg-[#3B82F6] hover:bg-[#2563EB] text-white text-[13px] font-bold transition"
                >
                  {editIdx !== null ? "UPDATE" : "ADD"}
                </button>
              </div>
            </div>

            {/* Added members preview */}
            {members.length > 0 && (
              <div className="mt-4 space-y-2">
                {members.map((m, i) => (
                  <div key={m._key} className="bg-white rounded-xl border border-[#E9EAEC] px-4 py-3 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-[#1F2937]">
                        {m.lname}, {m.fname}{m.name_extension ? " " + m.name_extension : ""}{m.mname ? " " + m.mname[0] + "." : ""}
                      </p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                        {m.sex} · {m.civil_status}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#6B7280] shrink-0">
                      {m.birthdate ? new Date(m.birthdate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "—"}
                    </span>
                    <span className="text-[11px] text-[#6B7280] shrink-0 w-24 text-right truncate">
                      {m.educational_attainment || "—"}
                    </span>
                    <div className="flex gap-2 shrink-0">
                      <button
                        onClick={() => handleEditMember(i)}
                        className="w-7 h-7 rounded-full bg-[#3B82F6] text-white flex items-center justify-center hover:bg-[#2563EB] transition"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={() => handleDeleteMember(i)}
                        className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <AmberBtn onClick={() => setStep(1)}>← Back</AmberBtn>
              <AmberBtn onClick={() => { if (members.length > 0) { setError(""); setStep(3); } else { setError("Add at least one household member."); } }}>
                Continue
              </AmberBtn>
            </div>
          </div>
        )}

        {/* ── STEP 3: Review & Finish ── */}
        {step === 3 && (
          <div>
            <div className="grid grid-cols-2 gap-6">

              {/* Left: Household Info */}
              <div className="bg-white rounded-2xl border border-[#E9EAEC] p-6">
                <h3 className="text-[13px] font-black text-[#1F2937] uppercase tracking-wide mb-4">
                  Household Information
                </h3>
                <div className="space-y-3">
                  {[
                    ["Household No.",         hhNoPreview],
                    ["House Address",         hh.address],
                    ["Housing Type",          hh.housing_type],
                    ["Water Source",          hh.water_source],
                    ["Comfort Room",          hh.comfort_room],
                    ["No. of Household Member", String(members.length)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">{label}</p>
                      <p className="text-[13px] text-[#1F2937] font-medium">{value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right: Members */}
              <div className="bg-white rounded-2xl border border-[#E9EAEC] p-6">
                <h3 className="text-[13px] font-black text-[#1F2937] uppercase tracking-wide mb-4">
                  Member Information
                </h3>
                <div className="space-y-3">
                  {members.map((m, i) => (
                    <div key={m._key} className="flex items-center justify-between border-b border-[#F4F5F7] pb-3 last:border-0 last:pb-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-[#1F2937]">
                          {m.fname} {m.mname ? m.mname[0] + ". " : ""}{m.lname}{m.name_extension ? " " + m.name_extension : ""}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">{m.sex} · {m.civil_status}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-[11px] text-[#6B7280]">
                          {m.birthdate ? new Date(m.birthdate).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" }) : "—"}
                        </p>
                        <p className="text-[10px] text-[#9CA3AF]">{m.educational_attainment || "—"}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{m.occupation || "—"}</p>
                      </div>
                      <div className="flex gap-2 ml-3 shrink-0">
                        <button
                          onClick={() => { setStep(2); handleEditMember(i); }}
                          className="w-7 h-7 rounded-full bg-[#3B82F6] text-white flex items-center justify-center hover:bg-[#2563EB] transition"
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          onClick={() => handleDeleteMember(i)}
                          className="w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 transition"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {error && <p className="text-red-500 text-[12px] mt-4 text-center">{error}</p>}

            <div className="flex gap-3 mt-6">
              <AmberBtn onClick={() => setStep(2)}>← Back</AmberBtn>
              <BlueBtn onClick={handleFinish} disabled={submitting}>
                {submitting ? "Saving…" : "Finish"}
              </BlueBtn>
            </div>
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <ConfirmMemberModal
          member={form}
          onSave={handleConfirmSave}
          onCancel={() => setShowConfirm(false)}
        />
      )}
    </div>
  );
}