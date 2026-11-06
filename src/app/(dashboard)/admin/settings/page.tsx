// FILE: src/app/(dashboard)/admin/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Landmark, Phone, UserCheck, Save, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { ADMIN_TUTORIALS } from "@/lib/adminTutorials";
import IncidentTypesManager from "@/components/shared/IncidentTypesManager";
import { GeneralSettings } from "@/lib/mock/admin";
import { useCan } from "@/lib/hooks/useCan";
import { fieldProblems, problemFor } from "@/lib/form-rules";
import { BRANDING_UPDATED } from "@/components/shared/BarangayLogo";
import FieldError, { fieldErrorBorder } from "@/components/shared/FieldError";

const DEFAULT_SETTINGS: GeneralSettings = {
  barangay_name: "",
  address: "",
  city: "",
  province: "",
  region: "",
  postal_code: "",
  contact_phone: "",
  contact_email: "",
  captain_override_name: "",
  captain_override_position: "",
  logo_barangay: "",
  logo_city: "",
};

/**
 * Reads an image file and shrinks it to at most 400×400, as a PNG data URL,
 * so a phone photo of the seal doesn't make every certificate several MB.
 */
async function toLogoDataUrl(file: File): Promise<string> {
  if (!/^image\/(png|jpeg)$/.test(file.type)) throw new Error("Use a PNG or JPG image.");
  if (file.size > 5 * 1024 * 1024) throw new Error("That image is over 5 MB. Use a smaller one.");
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("Couldn't read that image."));
      i.src = url;
    });
    const scale = Math.min(1, 400 / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function LogoSlot({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  const [error, setError] = useState("");
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full border border-dashed border-[#D1D5DB] bg-[#F9FAFB] dark:border-[#404040] dark:bg-[#111111]">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- a data URL preview, nothing to optimise
          <img src={value} alt={label} className="h-full w-full object-contain" />
        ) : (
          <span className="text-[10px] text-[#9CA3AF]">No logo</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#1F2937] dark:text-white">{label}</p>
        <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{hint}</p>
        {!disabled && (
          <div className="mt-2 flex items-center gap-3">
            <label className="cursor-pointer text-[12px] font-medium text-(--brand-fg) hover:text-(--brand-fg-strong)">
              {value ? "Replace" : "Upload"}
              <input
                type="file"
                accept="image/png,image/jpeg"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  try {
                    setError("");
                    onChange(await toLogoDataUrl(file));
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Couldn't use that image.");
                  }
                }}
              />
            </label>
            {value && (
              <button type="button" onClick={() => onChange("")} className="text-[12px] text-[#6B7280] hover:text-[#1F2937] dark:text-[#A3A3A3] dark:hover:text-white">
                Remove
              </button>
            )}
          </div>
        )}
        <FieldError message={error} />
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
  /** Shown under the field in red (src/lib/form-rules.ts). */
  error?: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280] dark:text-[#A3A3A3]">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={`w-full rounded-lg border border-[#E9EAEC] dark:border-[#333333] px-3 py-2.5 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-(--brand-line) ${error ? fieldErrorBorder : ""}`}
      />
      <FieldError message={error} />
      {hint && <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{hint}</p>}
    </div>
  );
}

export default function GeneralSettingsPage() {
  const can = useCan();
  // GET /api/settings returns a flattened { [key]: value } object built
  // from all SystemSetting rows. Any keys not yet set fall back to
  // DEFAULT_SETTINGS so the form always has strings to bind to.
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        // Older setups (and the seed) store some of these under other key names.
        setSettings({
          ...DEFAULT_SETTINGS,
          ...data,
          city: data.city || data.municipality || "",
          postal_code: data.postal_code || data.zip_code || "",
          contact_phone: data.contact_phone || data.contact_number || "",
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function update<K extends keyof GeneralSettings>(key: K, value: GeneralSettings[K]) {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  // Postal code, phone, email and name in the right shape (src/lib/form-rules.ts).
  const problems = fieldProblems([
    { field: "barangay_name", label: "Barangay name", value: settings.barangay_name, max: 100 },
    { field: "postal_code", label: "Postal code", value: settings.postal_code, max: 4 },
    { field: "contact_phone", label: "Contact phone", value: settings.contact_phone, kind: "contact" },
    { field: "contact_email", label: "Contact email", value: settings.contact_email, kind: "email" },
    { field: "captain_override_name", label: "Override name", value: settings.captain_override_name, kind: "name", max: 150 },
    { field: "captain_override_position", label: "Override position", value: settings.captain_override_position, max: 100 },
  ]);
  if (settings.postal_code && !/^\d{4}$/.test(settings.postal_code.trim())) {
    problems.push({ field: "postal_code", message: "Postal code is 4 digits, like 6000." });
  }
  const [saveError, setSaveError] = useState("");

  async function handleSave() {
    if (problems.length > 0) {
      setSaveError(problems[0].message);
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings), // each key upserted as a SystemSetting row
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Failed to save settings");
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      // The sidebar logo (BarangayLogo) reloads without a page refresh.
      window.dispatchEvent(new Event(BRANDING_UPDATED));
    } catch (e) {
      console.error(e);
      // It used to fail without telling anyone.
      setSaveError(e instanceof Error ? e.message : "Couldn't save the settings. Try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="General Settings"
        subtitle="Barangay information used across certificates, reports, and letterheads"
        tutorial={ADMIN_TUTORIALS.settings}
      />

      <div className="space-y-5">
        {/* Barangay Info */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-(--brand-tint)">
              <Landmark size={14} className="text-(--brand-fg-strong)" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Barangay Information</p>
          </div>

          <div className="space-y-4">
            <Field label="Barangay Name" value={settings.barangay_name} onChange={(v) => update("barangay_name", v)} error={problemFor(problems, "barangay_name")} />
            <Field label="Address" value={settings.address} onChange={(v) => update("address", v)} placeholder="Street, Purok" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="City / Municipality" value={settings.city} onChange={(v) => update("city", v)} />
              <Field label="Province" value={settings.province} onChange={(v) => update("province", v)} />
              <Field label="Region" value={settings.region} onChange={(v) => update("region", v)} />
            </div>
            <Field
              label="Postal Code"
              value={settings.postal_code}
              onChange={(v) => update("postal_code", v)}
              placeholder="6004" error={problemFor(problems, "postal_code")}
            />
          </div>
        </div>

        {/* Contact Info */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F5F7] dark:bg-[#262626]">
              <Phone size={14} className="text-[#374151] dark:text-[#D4D4D4]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Contact Information</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact Phone" value={settings.contact_phone} onChange={(v) => update("contact_phone", v)} placeholder="09XX-XXX-XXXX" error={problemFor(problems, "contact_phone")} />
            <Field label="Contact Email" value={settings.contact_email} onChange={(v) => update("contact_email", v)} placeholder="barangay@email.gov.ph" error={problemFor(problems, "contact_email")} />
          </div>
        </div>

        {/* Barangay logo: certificates, slips, sidebar and login page */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-5">
          <p className="mb-1 text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Barangay Logo</p>
          <p className="mb-4 text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">
            Shown at the top left of certificates and request slips, and in the sidebar and login page. Until one is uploaded, those
            places show the barangay name only. PNG or JPG; a square image with a transparent background looks best.
          </p>
          <LogoSlot
            label="Barangay seal"
            hint="Saved when you click Save Settings."
            value={settings.logo_barangay}
            onChange={(v) => update("logo_barangay", v)}
            disabled={!can("settings:write")}
          />
        </div>

        {/* Certificate Signatory Override */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF3C7] dark:bg-amber-500/15">
              <UserCheck size={14} className="text-[#D97706] dark:text-[#FBBF24]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">
              Certificate Signatory Override
            </p>
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-[#9CA3AF] dark:text-[#A3A3A3]">
            By default, certificates auto-attach the active Barangay Captain from the Officials directory. Set an
            override here only if that record is temporarily unavailable (e.g. vacant seat, officer-in-charge).
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="Override Name"
              value={settings.captain_override_name}
              onChange={(v) => update("captain_override_name", v)}
              placeholder="Leave blank to use active Captain" error={problemFor(problems, "captain_override_name")}
            />
            <Field
              label="Override Position"
              value={settings.captain_override_position}
              onChange={(v) => update("captain_override_position", v)} error={problemFor(problems, "captain_override_position")}
            />
          </div>
        </div>

        {/* Incident Types (2.11) */}
        <IncidentTypesManager />

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pb-8">
          {saved && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#059669] dark:text-[#34D399]">
              <CheckCircle2 size={14} />
              Settings saved
            </span>
          )}
          {saveError && <FieldError message={saveError} />}
          {can("settings:write") && (<button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-(--brand) px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-(--brand-hover) disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Settings"}
          </button>)}
        </div>
      </div>
    </div>
  );
}