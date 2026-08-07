// FILE: src/components/dashboard/DashboardCustomizeSheet.tsx
"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter } from "@/components/ui/sheet";
import { RotateCcw } from "lucide-react";
import {
  KPI_WIDGET_KEYS,
  WIDGET_LABELS,
  type WidgetKey,
  type DashboardPreferenceMap,
} from "@/lib/dashboard-defaults";

interface DashboardCustomizeSheetProps {
  open: boolean;
  preferences: DashboardPreferenceMap;
  onClose: () => void;
  onSaved: (prefs: DashboardPreferenceMap) => void;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#3B82F6]" : "bg-[#E5E7EB]"}`}
    >
      <span
        className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-4.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-[#1F2937]">{label}</p>
        {description && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{description}</p>}
      </div>
      <Toggle checked={checked} onChange={onChange} />
    </div>
  );
}

export default function DashboardCustomizeSheet({
  open, preferences, onClose, onSaved,
}: DashboardCustomizeSheetProps) {
  const [draft, setDraft] = useState<DashboardPreferenceMap>(preferences);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Re-sync the draft whenever the panel is (re)opened with fresh preferences.
  const [syncedForOpen, setSyncedForOpen] = useState(false);
  if (open && !syncedForOpen) {
    setSyncedForOpen(true);
    setDraft(preferences);
  }
  if (!open && syncedForOpen) {
    setSyncedForOpen(false);
  }

  const kpiMasterOn = KPI_WIDGET_KEYS.some((k) => draft[k]);

  function set(key: WidgetKey, value: boolean) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function toggleAllKpis(value: boolean) {
    setDraft((d) => {
      const next = { ...d };
      for (const k of KPI_WIDGET_KEYS) next[k] = value;
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/dashboard-preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: Object.entries(draft).map(([widget_key, is_enabled]) => ({ widget_key, is_enabled })),
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      const data = await res.json();
      onSaved(data.preferences);
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      const res = await fetch("/api/dashboard-preferences", { method: "DELETE" });
      if (!res.ok) throw new Error("Reset failed");
      const data = await res.json();
      setDraft(data.preferences);
      onSaved(data.preferences);
    } catch (e) {
      console.error(e);
    } finally {
      setResetting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent widthClassName="max-w-md">
        <SheetHeader>
          <div>
            <SheetTitle>Customize Dashboard</SheetTitle>
          </div>
          <SheetClose />
        </SheetHeader>

        <SheetBody>
          <div className="space-y-5">
            {/* KPI Metrics */}
            <div>
              <div className="mb-1 flex items-center justify-between">
                <p className="text-[11px] font-black uppercase tracking-widest text-[#1F2937]">KPI Metrics</p>
                <Toggle checked={kpiMasterOn} onChange={toggleAllKpis} />
              </div>
              <p className="mb-2 text-[11px] text-[#9CA3AF]">Stat cards shown at the top of your dashboard.</p>
              <div className="rounded-xl border border-[#E9EAEC] px-4 divide-y divide-[#F4F5F7]">
                {KPI_WIDGET_KEYS.map((key) => (
                  <ToggleRow
                    key={key}
                    label={WIDGET_LABELS[key]}
                    checked={draft[key]}
                    onChange={(v) => set(key, v)}
                  />
                ))}
              </div>
            </div>

            {/* Other sections */}
            <div>
              <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-[#1F2937]">
                Sections
              </p>
              <div className="rounded-xl border border-[#E9EAEC] px-4 divide-y divide-[#F4F5F7]">
                <ToggleRow
                  label="Quick Actions"
                  description="Frequently used action buttons"
                  checked={draft.quick_actions}
                  onChange={(v) => set("quick_actions", v)}
                />
                <ToggleRow
                  label="Priority Tasks"
                  description="Role-based pending tasks"
                  checked={draft.priority_tasks}
                  onChange={(v) => set("priority_tasks", v)}
                />
                <ToggleRow
                  label="Activity Feed"
                  description="Recent system activity"
                  checked={draft.activity_feed}
                  onChange={(v) => set("activity_feed", v)}
                />
                <ToggleRow
                  label="Document Status Chart"
                  checked={draft.document_status_chart}
                  onChange={(v) => set("document_status_chart", v)}
                />
              </div>
            </div>

            <button
              onClick={handleReset}
              disabled={resetting}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#E9EAEC] py-2.5 text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7] disabled:opacity-60"
            >
              <RotateCcw size={12} />
              {resetting ? "Resetting..." : "Reset to Role Defaults"}
            </button>
          </div>
        </SheetBody>

        <SheetFooter>
          <button
            onClick={onClose}
            className="rounded-lg border border-[#E9EAEC] px-4 py-2.5 text-[12px] font-bold uppercase tracking-wide text-[#6B7280] transition hover:bg-[#F4F5F7]"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-lg bg-[#3B82F6] px-5 py-2.5 text-[12px] font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#2563EB] disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save Preferences"}
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}