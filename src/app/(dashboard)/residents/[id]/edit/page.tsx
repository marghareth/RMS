"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import {
  getMockResidents,
  getMockPuroks,
  updateMockResident,
  type Resident,
} from "@/lib/mockResidents";

// ─── TYPES ────────────────────────────────────────────────────────────────────
interface ResidentForm {
  fname:                  string;
  lname:                  string;
  mname:                  string;
  name_extension:         string;
  birthdate:              string;
  place_of_birth:         string;
  sex:                    string;
  civil_status:           string;
  citizenship:            string;
  religion:               string;
  nationality:            string;
  employment_status:      string;
  educational_attainment: string;
  occupation:             string;
  income_bracket:         string;
  sector:                 string;
  purok_id:               string;
  household_id:           string;
}

function buildForm(r: Resident): ResidentForm {
  return {
    fname:                  r.fname                  ?? "",
    lname:                  r.lname                  ?? "",
    mname:                  r.mname                  ?? "",
    name_extension:         r.name_extension         ?? "",
    birthdate:              r.birthdate ? r.birthdate.split("T")[0] : "",
    place_of_birth:         r.place_of_birth         ?? "",
    sex:                    r.sex                    ?? "",
    civil_status:           r.civil_status           ?? "",
    citizenship:            r.citizenship            ?? "Filipino",
    religion:               r.religion               ?? "",
    nationality:            r.nationality            ?? "Filipino",
    employment_status:      r.employment_status      ?? "",
    educational_attainment: r.educational_attainment ?? "",
    occupation:             r.occupation             ?? "",
    income_bracket:         r.income_bracket         ?? "",
    sector:                 r.sector                 ?? "",
    purok_id:               r.purok_id     ? String(r.purok_id)     : "",
    household_id:           r.household_id ? String(r.household_id) : "",
  };
}

const EMPTY: ResidentForm = {
  fname: "", lname: "", mname: "", name_extension: "",
  birthdate: "", place_of_birth: "", sex: "", civil_status: "",
  citizenship: "Filipino", religion: "", nationality: "Filipino",
  employment_status: "", educational_attainment: "", occupation: "",
  income_bracket: "", sector: "", purok_id: "", household_id: "",
};

// ─── FIELD COMPONENTS ─────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="text-[10px] font-semibold text-[#6B7280] uppercase tracking-wide block mb-1">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function TextInput({
  label, value, onChange, placeholder, required, type = "text",
}: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; type?: string;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="w-full text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] placeholder:text-[#D1D5DB] transition bg-white"
      />
    </div>
  );
}

function SelectInput({
  label, value, onChange, options, required,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <div>
      <FieldLabel required={required}>{label}</FieldLabel>
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full appearance-none text-[13px] border border-[#E9EAEC] rounded-xl px-4 py-2.5 focus:outline-none focus:border-[#3B82F6] focus:ring-2 focus:ring-blue-50 text-[#1F2937] pr-8 bg-white transition"
        >
          <option value="">— Select —</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] text-[10px]">▼</span>
      </div>
    </div>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-[#E9EAEC] p-5">
      <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937] mb-4">{title}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────────
export default function EditResidentPage() {
  const router  = useRouter();
  const { id }  = useParams<{ id: string }>();
  const puroks  = getMockPuroks();

  // ── Lazy initializers — no setState calls inside useEffect ─────────────────
  // The resident and form are derived synchronously at mount time from the mock
  // store. If the resident doesn't exist we render null and let the effect below
  // handle the redirect (effects can call router.push safely).

  const [resident] = useState<Resident | null>(
    () => getMockResidents().find(r => String(r.id) === String(id)) ?? null
  );

  const [form,   setForm]   = useState<ResidentForm>(
    () => {
      const r = getMockResidents().find(r => String(r.id) === String(id));
      return r ? buildForm(r) : EMPTY;
    }
  );

  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  // ── Redirect only — no setState here ──────────────────────────────────────
  useEffect(() => {
    if (!resident) router.push("/residents");
  }, [resident, router]);

  const set = (k: keyof ResidentForm, v: string) =>
    setForm(prev => ({ ...prev, [k]: v }));

  async function handleSave() {
    if (!form.fname || !form.lname || !form.birthdate || !form.sex || !form.civil_status) {
      setError("Please fill in all required fields.");
      return;
    }
    setSaving(true);
    setError("");

    try {
      const res = await fetch(`/api/residents/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          purok_id:     form.purok_id     ? parseInt(form.purok_id)     : null,
          household_id: form.household_id ? parseInt(form.household_id) : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save changes");

      // ── Mock: persist to mock store ────────────────────────────────────────
      updateMockResident(Number(id), {
        fname:                  form.fname,
        lname:                  form.lname,
        mname:                  form.mname                  || null,
        name_extension:         form.name_extension         || null,
        birthdate:              form.birthdate,
        place_of_birth:         form.place_of_birth         || null,
        sex:                    form.sex as Resident["sex"],
        civil_status:           form.civil_status as Resident["civil_status"],
        citizenship:            form.citizenship,
        religion:               form.religion               || null,
        nationality:            form.nationality,
        employment_status:      form.employment_status      || null,
        educational_attainment: form.educational_attainment || null,
        occupation:             form.occupation             || null,
        income_bracket:         form.income_bracket         || null,
        sector:                 form.sector                 || null,
        purok_id:               form.purok_id     ? parseInt(form.purok_id)     : null,
        household_id:           form.household_id ? parseInt(form.household_id) : null,
        updated_at:             new Date().toISOString(),
      });

      router.push(`/residents/${id}`);
    } catch (e: any) {
      setError(e.message || "Something went wrong.");
      setSaving(false);
    }
  }

  // Resident not found — effect will redirect, show nothing meanwhile
  if (!resident) return null;

  return (
    <div>
      {/* ── Page header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push(`/residents/${id}`)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F4F5F7] transition"
          >
            <ArrowLeft size={18} className="text-[#6B7280]" />
          </button>
          <div>
            <h1 className="text-[16px] font-black text-[#1F2937] uppercase tracking-wide">
              Edit Resident
            </h1>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">
              {resident.lname}, {resident.fname} · BM{String(resident.id).padStart(7, "0")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {error && <p className="text-[12px] text-red-500 font-medium">{error}</p>}
          <button
            onClick={() => router.push(`/residents/${id}`)}
            className="px-4 py-2 rounded-xl border border-[#E9EAEC] text-[12px] font-bold text-[#6B7280] hover:bg-[#F4F5F7] transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#3B82F6] text-white text-[12px] font-bold hover:bg-[#2563EB] disabled:opacity-50 transition shadow-sm"
          >
            <Save size={13} />
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>

      {/* ── Form sections ── */}
      <div className="grid grid-cols-2 gap-5">

        {/* Personal Information */}
        <SectionCard title="Personal Information">
          <div className="grid grid-cols-3 gap-3">
            <TextInput label="Last Name"   value={form.lname} onChange={v => set("lname", v)} required />
            <TextInput label="First Name"  value={form.fname} onChange={v => set("fname", v)} required />
            <TextInput label="Middle Name" value={form.mname} onChange={v => set("mname", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label="Name Extension"
              value={form.name_extension}
              onChange={v => set("name_extension", v)}
              options={[
                { value: "Jr.", label: "Jr." }, { value: "Sr.", label: "Sr." },
                { value: "II",  label: "II"  }, { value: "III", label: "III" },
                { value: "IV",  label: "IV"  },
              ]}
            />
            <TextInput
              label="Date of Birth"
              value={form.birthdate}
              onChange={v => set("birthdate", v)}
              type="date"
              required
            />
          </div>
          <TextInput
            label="Place of Birth"
            value={form.place_of_birth}
            onChange={v => set("place_of_birth", v)}
          />
          <div className="grid grid-cols-2 gap-3">
            <SelectInput
              label="Sex" value={form.sex} onChange={v => set("sex", v)} required
              options={[
                { value: "MALE",   label: "Male"   },
                { value: "FEMALE", label: "Female" },
              ]}
            />
            <SelectInput
              label="Civil Status" value={form.civil_status} onChange={v => set("civil_status", v)} required
              options={[
                { value: "SINGLE",    label: "Single"    },
                { value: "MARRIED",   label: "Married"   },
                { value: "WIDOWED",   label: "Widowed"   },
                { value: "SEPARATED", label: "Separated" },
                { value: "LIVE_IN",   label: "Live-in"   },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Citizenship" value={form.citizenship} onChange={v => set("citizenship", v)} />
            <TextInput label="Nationality" value={form.nationality} onChange={v => set("nationality", v)} />
          </div>
          <TextInput label="Religion" value={form.religion} onChange={v => set("religion", v)} />
        </SectionCard>

        {/* Socio-Economic */}
        <SectionCard title="Socio-Economic">
          <SelectInput
            label="Employment Status" value={form.employment_status} onChange={v => set("employment_status", v)}
            options={[
              { value: "EMPLOYED",      label: "Employed"      },
              { value: "UNEMPLOYED",    label: "Unemployed"    },
              { value: "SELF_EMPLOYED", label: "Self-employed" },
              { value: "STUDENT",       label: "Student"       },
              { value: "RETIRED",       label: "Retired"       },
            ]}
          />
          <SelectInput
            label="Educational Attainment" value={form.educational_attainment} onChange={v => set("educational_attainment", v)}
            options={[
              { value: "NO FORMAL",          label: "No Formal Education" },
              { value: "ELEM.",              label: "Elementary"          },
              { value: "HIGH SCHOOL",        label: "High School"         },
              { value: "COLLEGE UNDERGRAD.", label: "College Undergrad."  },
              { value: "COLLEGE GRAD.",      label: "College Grad."       },
              { value: "POST GRAD.",         label: "Post Graduate"       },
              { value: "VOCATIONAL",         label: "Vocational"          },
            ]}
          />
          <SelectInput
            label="Occupation" value={form.occupation} onChange={v => set("occupation", v)}
            options={[
              { value: "EMPLOYED",   label: "Employed"   }, { value: "STUDENT",   label: "Student"   },
              { value: "TEACHER",    label: "Teacher"    }, { value: "POLICE",     label: "Police"    },
              { value: "FARMER",     label: "Farmer"     }, { value: "VENDOR",     label: "Vendor"    },
              { value: "NURSE",      label: "Nurse"      }, { value: "HOUSEWIFE",  label: "Housewife" },
              { value: "UNEMPLOYED", label: "Unemployed" }, { value: "OTHER",      label: "Other"     },
            ]}
          />
          <SelectInput
            label="Income Bracket" value={form.income_bracket} onChange={v => set("income_bracket", v)}
            options={[
              { value: "BELOW_5K",  label: "Below ₱5,000"       },
              { value: "5K_10K",    label: "₱5,000 – ₱10,000"  },
              { value: "10K_20K",   label: "₱10,000 – ₱20,000" },
              { value: "20K_40K",   label: "₱20,000 – ₱40,000" },
              { value: "ABOVE_40K", label: "Above ₱40,000"      },
            ]}
          />
          <SelectInput
            label="Sector" value={form.sector} onChange={v => set("sector", v)}
            options={[
              { value: "SENIOR",    label: "Senior Citizen"  },
              { value: "PWD",       label: "PWD"             },
              { value: "YOUTH",     label: "Youth"           },
              { value: "4PS",       label: "4Ps Beneficiary" },
              { value: "EDUCATION", label: "Education"       },
              { value: "TRANSPORT", label: "Transport"       },
              { value: "N/A",       label: "N/A"             },
            ]}
          />
        </SectionCard>

        {/* Address & Household */}
        <SectionCard title="Address & Household">
          <SelectInput
            label="Purok"
            value={form.purok_id}
            onChange={v => set("purok_id", v)}
            options={puroks.map(p => ({ value: String(p.id), label: p.name }))}
          />
          {/* Household selector — uncomment when API is connected
          <SelectInput
            label="Household"
            value={form.household_id}
            onChange={v => set("household_id", v)}
            options={households.map(h => ({ value: String(h.id), label: `${h.household_no} — ${h.address}` }))}
          /> */}
        </SectionCard>

      </div>
    </div>
  );
}