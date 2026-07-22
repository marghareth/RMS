// FILE: src/app/(dashboard)/certificates/templates/page.tsx
"use client";

import { useMemo, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileEdit, RotateCcw, Save, Info, ChevronRight, CheckCircle2 } from "lucide-react";
import { CERTIFICATE_TYPES, CertificateType, MOCK_ACTIVE_CAPTAIN, MOCK_BARANGAY_INFO } from "@/lib/mock/certificates";
import {
  updateMockTemplate,
  resetMockTemplate,
  renderTemplate,
  TEMPLATE_PLACEHOLDERS,
  CertificateTemplateMock,
} from "@/lib/mock/certificateTemplates";

// Sample values used to render the live preview — stands in for a real
// resident + certificate record so admins can see the merged output while
// editing, without needing to issue an actual certificate first.
const SAMPLE_VALUES = {
  full_name: "SANTOS, MARIA R.",
  address: "Purok II, Brgy. Quisol",
  purpose: "Requirement for school enrollment of dependent",
  captain_name: MOCK_ACTIVE_CAPTAIN.name,
  captain_position: MOCK_ACTIVE_CAPTAIN.position,
  barangay_name: MOCK_BARANGAY_INFO.name,
  city: MOCK_BARANGAY_INFO.city,
  province: MOCK_BARANGAY_INFO.province,
  date_issued: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
};

export default function CertificateTemplatesPage() {
  const router = useRouter();

  // ── MOCK DATA STATE ──────────────────────────────────────────────────────
  // Swap this for a real fetch once the database is connected (see the
  // commented-out effect below).
  // const [templates, setTemplates] = useState<CertificateTemplateMock[]>(() => getMockTemplates());

  // ── REAL DATA FETCH (disabled until API/DB is wired up) ─────────────────
  const [templates, setTemplates] = useState<CertificateTemplateMock[]>([]);
  const [loading, setLoading] = useState(true);
  //
  useEffect(() => {
    fetch("/api/certificate-templates")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const [selectedType, setSelectedType] = useState<CertificateType>(CERTIFICATE_TYPES[0].value);
  const selected = templates.find((t) => t.certificate_type === selectedType);

  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function selectType(type: CertificateType) {
    setSelectedType(type);
    setSaved(false);
  }

  async function handleSave(values: { title: string; body: string; closing_line: string }) {
    setSaving(true);

    // ── REAL SUBMIT (disabled until API/DB is wired up) ───────────────────
    try {
      const res = await fetch(`/api/certificate-templates/${selectedType}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to save template");
      const updated = await res.json();
      setTemplates((prev) => prev.map((t) => (t.certificate_type === selectedType ? updated : t)));
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    if (!selected) return;
    if (!confirm(`Reset the "${selected.title}" template to its default wording? Unsaved edits will be lost.`)) return;
    setSaving(true);

    // ── REAL RESET (disabled until API/DB is wired up) ─────────────────
    try {
      const res = await fetch(`/api/certificate-templates/${selectedType}/reset`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to reset template");
      const reset = await res.json();
      setTemplates((prev) => prev.map((t) => (t.certificate_type === selectedType ? reset : t)));
      setSaved(false);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => router.push("/certificates")}
        className="mb-4 flex items-center gap-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:text-[#1F2937]"
      >
        <ArrowLeft size={14} />
        Back to Certificates
      </button>

      <div className="mb-5">
        <h1 className="text-xl font-bold text-[#1F2937]">Manage Certificate Templates</h1>
        <p className="mt-0.5 text-[13px] text-[#9CA3AF]">
          Edit the wording used when a certificate of each type is previewed or printed.
        </p>
      </div>

      <div className="flex gap-5">
        {/* ── Left: type list ── */}
        <div className="w-70 shrink-0 overflow-hidden rounded-xl border border-[#E9EAEC] bg-white">
          {CERTIFICATE_TYPES.map((t) => {
            const tpl = templates.find((x) => x.certificate_type === t.value);
            const active = selectedType === t.value;
            return (
              <button
                key={t.value}
                onClick={() => selectType(t.value)}
                disabled={!tpl}
                className={`flex w-full items-center gap-3 border-b border-[#F4F5F7] px-4 py-3 text-left transition last:border-b-0 disabled:opacity-50 ${
                  active ? "bg-[#3B82F6]" : "hover:bg-[#F9FAFB]"
                }`}
              >
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-[13px] font-bold ${active ? "text-white" : "text-[#1F2937]"}`}>
                    {t.label}
                  </p>
                  <p className={`mt-0.5 truncate text-[11px] ${active ? "text-blue-100" : "text-[#9CA3AF]"}`}>
                    {loading ? "Loading…" : tpl?.updated_by ? `Edited by ${tpl.updated_by}` : "Default wording"}
                  </p>
                </div>
                <ChevronRight size={14} className={active ? "text-white" : "text-[#D1D5DB]"} />
              </button>
            );
          })}
        </div>

        {/* ── Right: editor + live preview ── */}
        <div className="flex-1 space-y-5">
          {loading || !selected ? (
            <div className="flex items-center justify-center rounded-xl border border-[#E9EAEC] bg-white p-16 text-[12px] font-semibold text-[#9CA3AF]">
              {loading ? "Loading templates…" : "Template not found."}
            </div>
          ) : (
            <TemplateEditor
              // Keying on the template's identity + last-updated timestamp
              // makes React reset the editor's local draft state whenever a
              // different type is selected, or after a save/reset changes
              // the underlying record — with no effect required.
              key={`${selected.certificate_type}:${selected.updated_at}`}
              type={selectedType}
              template={selected}
              saving={saving}
              saved={saved}
              onSave={handleSave}
              onReset={handleReset}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Editor + live preview for a single template ─────────────────────────────
// Local draft state is initialized straight from `template` and reset by
// React whenever the parent's `key` changes (new type selected, or the
// template was just saved/reset) — no synchronizing effect needed.
function TemplateEditor({
  type,
  template,
  saving,
  saved,
  onSave,
  onReset,
}: {
  type: CertificateType;
  template: CertificateTemplateMock;
  saving: boolean;
  saved: boolean;
  onSave: (values: { title: string; body: string; closing_line: string }) => void;
  onReset: () => void;
}) {
  const [draftTitle, setDraftTitle] = useState(template.title);
  const [draftBody, setDraftBody] = useState(template.body);
  const [draftClosing, setDraftClosing] = useState(template.closing_line);

  const isDirty =
    draftTitle !== template.title ||
    draftBody !== template.body ||
    draftClosing !== template.closing_line;

  const previewBody = useMemo(() => renderTemplate(draftBody, SAMPLE_VALUES), [draftBody]);
  const previewClosing = useMemo(() => renderTemplate(draftClosing, SAMPLE_VALUES), [draftClosing]);
  const previewTitle = useMemo(() => renderTemplate(draftTitle, SAMPLE_VALUES), [draftTitle]);

  return (
    <>
      <div className="rounded-xl border border-[#E9EAEC] bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#EBF3FF]">
              <FileEdit size={14} className="text-[#1D4ED8]" />
            </div>
            <p className="text-[13px] font-black uppercase tracking-wide text-[#1F2937]">
              Editing: {CERTIFICATE_TYPES.find((t) => t.value === type)?.label}
            </p>
          </div>
          <button
            onClick={onReset}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-lg border border-[#E9EAEC] px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7] disabled:opacity-50"
          >
            <RotateCcw size={12} />
            Reset to Default
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Title / Heading
            </label>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              className="w-full rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] font-semibold uppercase tracking-wide text-[#1F2937] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Body
            </label>
            <textarea
              value={draftBody}
              onChange={(e) => setDraftBody(e.target.value)}
              rows={6}
              className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] leading-relaxed text-[#1F2937] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
              Closing / Signatory Line
            </label>
            <textarea
              value={draftClosing}
              onChange={(e) => setDraftClosing(e.target.value)}
              rows={2}
              className="w-full resize-none rounded-lg border border-[#E9EAEC] px-3 py-2.5 text-[13px] leading-relaxed text-[#1F2937] outline-none focus:border-[#3B82F6]"
            />
          </div>

          <div className="rounded-lg bg-[#F9FAFB] px-3 py-2.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <Info size={12} className="text-[#6B7280]" />
              <p className="text-[10px] font-semibold uppercase tracking-wide text-[#6B7280]">
                Available Placeholders
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {TEMPLATE_PLACEHOLDERS.map((p) => (
                <span
                  key={p.token}
                  title={p.description}
                  className="rounded-md bg-white px-2 py-1 font-mono text-[10px] text-[#3B82F6] shadow-sm"
                >
                  {p.token}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="flex items-center gap-1.5 text-[12px] font-semibold text-[#059669]">
                <CheckCircle2 size={14} />
                Template saved
              </span>
            )}
            <button
              onClick={() => onSave({ title: draftTitle, body: draftBody, closing_line: draftClosing })}
              disabled={saving || !isDirty}
              className="flex items-center gap-2 rounded-lg bg-[#3B82F6] px-6 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-50"
            >
              <Save size={14} />
              {saving ? "Saving..." : "Save Template"}
            </button>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="rounded-xl border border-[#E9EAEC] bg-white p-6">
        <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-[#9CA3AF]">
          Live Preview <span className="font-normal normal-case">(using sample data)</span>
        </p>
        <div className="rounded-lg border border-dashed border-[#E9EAEC] bg-[#F9FAFB] p-6">
          <h2 className="mb-4 text-center text-[15px] font-black uppercase tracking-widest text-[#1F2937]">
            {previewTitle}
          </h2>
          <p className="text-[13px] leading-loose text-[#374151]">TO WHOM IT MAY CONCERN:</p>
          <p className="indent-8 text-justify text-[13px] leading-loose text-[#374151]">{previewBody}</p>
          <p className="indent-8 text-justify text-[13px] leading-loose text-[#374151]">
            This certification is being issued upon the request of the above-named person for the purpose of:
          </p>
          <p className="rounded-lg bg-white px-4 py-3 text-center text-[13px] font-semibold uppercase text-[#1F2937]">
            {SAMPLE_VALUES.purpose}
          </p>
          <p className="indent-8 text-justify text-[13px] leading-loose text-[#374151]">{previewClosing}</p>
        </div>
      </div>
    </>
  );
}