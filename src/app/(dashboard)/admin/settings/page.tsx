// FILE: src/app/(dashboard)/admin/settings/page.tsx
"use client";

import { useState, useEffect } from "react";
import { Landmark, Phone, UserCheck, Save, CheckCircle2, Sparkles } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import IncidentTypesManager from "@/components/shared/IncidentTypesManager";
import { GeneralSettings } from "@/lib/mock/admin";

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
};

function Field({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hint?: string;
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
        className="w-full rounded-lg border border-[#E9EAEC] dark:border-[#333333] px-3 py-2.5 text-[13px] text-[#1F2937] dark:text-white outline-none transition placeholder:text-[#9CA3AF] dark:placeholder:text-[#737373] focus:border-[#3B82F6] dark:focus:border-[#60A5FA]"
      />
      {hint && <p className="mt-1 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3]">{hint}</p>}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#0B6E4F] dark:bg-[#34A37A]" : "bg-[#E9EAEC] dark:bg-[#333333]"
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export default function GeneralSettingsPage() {
  // GET /api/settings returns a flattened { [key]: value } object built
  // from all SystemSetting rows. Any keys not yet set fall back to
  // DEFAULT_SETTINGS so the form always has strings to bind to.
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  // Not part of GeneralSettings — it's a plain SystemSetting row like
  // everything else here, just boolean rather than freeform text, so it's
  // tracked separately and merged into the same PATCH body on save.
  const [onboardingEnabled, setOnboardingEnabled] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      setLoading(true);
      try {
        const res = await fetch("/api/settings");
        const data = await res.json();
        setSettings({ ...DEFAULT_SETTINGS, ...data });
        // Stored as the string "true"/"false" like every other SystemSetting
        // row; absent (never configured) defaults to enabled, opt-out not opt-in.
        setOnboardingEnabled(data.onboarding_tour_enabled !== "false");
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

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        // each key upserted as a SystemSetting row
        body: JSON.stringify({ ...settings, onboarding_tour_enabled: onboardingEnabled }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] dark:border-[#60A5FA] border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="General Settings"
        subtitle="Barangay information used across certificates, reports, and letterheads"
      />

      <div className="space-y-5">
        {/* Barangay Info */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF] dark:bg-blue-500/15">
              <Landmark size={14} className="text-[#1D4ED8] dark:text-[#93C5FD]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Barangay Information</p>
          </div>

          <div className="space-y-4">
            <Field label="Barangay Name" value={settings.barangay_name} onChange={(v) => update("barangay_name", v)} />
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
              placeholder="6004"
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
            <Field label="Contact Phone" value={settings.contact_phone} onChange={(v) => update("contact_phone", v)} placeholder="09XX-XXX-XXXX" />
            <Field label="Contact Email" value={settings.contact_email} onChange={(v) => update("contact_email", v)} placeholder="barangay@email.gov.ph" />
          </div>
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
              placeholder="Leave blank to use active Captain"
            />
            <Field
              label="Override Position"
              value={settings.captain_override_position}
              onChange={(v) => update("captain_override_position", v)}
            />
          </div>
        </div>

        {/* Guided Tour / demo mode for new users */}
        <div className="rounded-xl border border-[#E9EAEC] dark:border-[#333333] bg-white dark:bg-[#171717] shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.45)] p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#E8F3EE] dark:bg-[#11321F]">
              <Sparkles size={14} className="text-[#0B6E4F] dark:text-[#34A37A]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937] dark:text-white">Guided Tour</p>
          </div>

          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-semibold text-[#1F2937] dark:text-white">
                Ask new users if they&apos;d like a walkthrough
              </p>
              <p className="mt-1 text-[11px] leading-relaxed text-[#9CA3AF] dark:text-[#A3A3A3]">
                When on, every account is asked once — on their first login — whether they want a guided,
                click-by-click tour of the dashboard. Answering either way (or turning this off here) means they
                won&apos;t be asked again. Anyone can still replay the tour manually anytime from the{" "}
                <span className="rounded border border-[#E9EAEC] px-1 py-0.5 dark:border-[#333333]">?</span> icon at
                the top of the screen, whether or not this is on.
              </p>
            </div>
            <Toggle checked={onboardingEnabled} onChange={setOnboardingEnabled} label="Ask new users if they'd like a walkthrough" />
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
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] dark:hover:bg-[#3B82F6] disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}