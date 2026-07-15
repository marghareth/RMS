"use client";

import { useState, useEffect } from "react";
import { Landmark, Phone, UserCheck, Save, CheckCircle2 } from "lucide-react";
import PageHeader from "@/components/shared/PageHeader";
import { GeneralSettings } from "@/lib/mock/admin";

const DEFAULT_SETTINGS: GeneralSettings = {
  barangay_name: "",
  address: "",
  city: "",
  province: "",
  region: "",
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
      <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
        {label}
      </label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#3B82F6]"
      />
      {hint && <p className="mt-1 text-[11px] text-[#9CA3AF]">{hint}</p>}
    </div>
  );
}

export default function GeneralSettingsPage() {
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
        setSettings({ ...DEFAULT_SETTINGS, ...data });
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
        body: JSON.stringify(settings), // each key upserted as a SystemSetting row
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
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3B82F6] border-t-transparent" />
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
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
              <Landmark size={14} className="text-[#1D4ED8]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Barangay Information</p>
          </div>

          <div className="space-y-4">
            <Field label="Barangay Name" value={settings.barangay_name} onChange={(v) => update("barangay_name", v)} />
            <Field label="Address" value={settings.address} onChange={(v) => update("address", v)} placeholder="Street, Purok" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="City / Municipality" value={settings.city} onChange={(v) => update("city", v)} />
              <Field label="Province" value={settings.province} onChange={(v) => update("province", v)} />
              <Field label="Region" value={settings.region} onChange={(v) => update("region", v)} />
            </div>
          </div>
        </div>

        {/* Contact Info */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F4F5F7]">
              <Phone size={14} className="text-[#374151]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">Contact Information</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Contact Phone" value={settings.contact_phone} onChange={(v) => update("contact_phone", v)} placeholder="09XX-XXX-XXXX" />
            <Field label="Contact Email" value={settings.contact_email} onChange={(v) => update("contact_email", v)} placeholder="barangay@email.gov.ph" />
          </div>
        </div>

        {/* Certificate Signatory Override */}
        <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEF3C7]">
              <UserCheck size={14} className="text-[#D97706]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">
              Certificate Signatory Override
            </p>
          </div>
          <p className="mb-4 text-[11px] leading-relaxed text-[#9CA3AF]">
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

        {/* Save */}
        <div className="flex items-center justify-end gap-3 pb-8">
          {saved && (
            <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#059669]">
              <CheckCircle2 size={14} />
              Settings saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
          >
            <Save size={14} />
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}