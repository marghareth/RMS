// FILE: src/components/registries/RegistryDetailSheet.tsx
//
// The registry entry detail view, as a slide-over instead of a full page
// navigation — same content as (dashboard)/registries/*/[id]/page.tsx
// (which still exists for direct links/bookmarks), just re-homed so it can
// render inside <Sheet> and be driven by an `entryId` prop from the list
// page. Mirrors the pattern set by BlotterCaseSheet.
//
// Redesign (Nov 2026): the body is RegistryEntryView, shared with the full
// page. Header is the name with one plain line under it (no icon tile or
// pill); Remove asks through ConfirmDialog instead of the browser pop-up.
//
// BUGFIX (Nov 2026): every entry showed "Entry not found" because
// /api/registries/[id] was looking up a resident instead of the registry
// entry (fixed in that route). Remove now checks registries:delete and
// reports a failed removal instead of closing as if it had worked.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, SheetBody, SheetFooter,
} from "@/components/ui/sheet";
import EmptyState from "@/components/shared/EmptyState";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useCan } from "@/lib/hooks/useCan";
import RegistryEntryView, {
  REGISTRY_LABEL, displayName, entrySubtitle, type RegistryEntry,
} from "@/components/registries/RegistryEntryView";

interface RegistryDetailSheetProps {
  /** The registry entry to show, or null to keep the sheet closed. */
  entryId: number | null;
  /** Registry name, e.g. "Senior Citizens" (used in messages). */
  title: string;
  /** Kept for callers; the redesigned header no longer shows an icon tile. */
  icon?: LucideIcon;
  iconBg?: string;
  /** e.g. "/registries/senior-citizens" — used for the "open full page" link. */
  listBase: string;
  onClose: () => void;
  /** Called after a successful removal, so the list page can refetch. */
  onRemoved?: () => void;
}

export default function RegistryDetailSheet({
  entryId, title, listBase, onClose, onRemoved,
}: RegistryDetailSheetProps) {
  const can = useCan();
  const router = useRouter();
  const open = entryId !== null;

  const [entry, setEntry] = useState<RegistryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removeError, setRemoveError] = useState("");

  // Reset stale content synchronously when switching between entries while
  // the sheet stays mounted (same pattern as BlotterCaseSheet).
  const [syncedEntryId, setSyncedEntryId] = useState<number | null>(null);
  if (entryId !== null && entryId !== syncedEntryId) {
    setSyncedEntryId(entryId);
    setEntry(null);
    setLoading(true);
    setRemoveError("");
  } else if (entryId === null && syncedEntryId !== null) {
    setSyncedEntryId(null);
  }

  useEffect(() => {
    if (entryId === null) return;
    let cancelled = false;

    fetch(`/api/registries/${entryId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data) => { if (!cancelled) setEntry(data); })
      .catch(() => { if (!cancelled) setEntry(null); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [entryId]);

  async function handleRemove() {
    if (!entry) return;
    setDeleting(true);
    setRemoveError("");
    try {
      // Removes the registry entry only — the resident's RBI record stays.
      const res = await fetch(`/api/registries/${entry.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setRemoveError(data?.message || data?.error || "Couldn't remove this resident from the registry. Please try again.");
        setConfirming(false);
        return;
      }
      setConfirming(false);
      onRemoved?.();
      onClose();
    } catch {
      setRemoveError("Couldn't remove this resident from the registry. Please try again.");
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <SheetContent className="p-0">
        {loading || !entry ? (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <SheetTitle>{loading ? "Loading…" : "Entry not found"}</SheetTitle>
              <SheetClose />
            </SheetHeader>
            <SheetBody>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
                </div>
              ) : (
                <EmptyState
                  icon={FileText}
                  title="Entry not found"
                  description="This registry entry doesn't exist or may have been removed."
                />
              )}
            </SheetBody>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            <SheetHeader>
              <div className="min-w-0">
                <SheetTitle className="text-[17px] font-semibold">{displayName(entry.resident)}</SheetTitle>
                <p className="mt-0.5 text-[12.5px] text-[#6B7280] dark:text-[#A3A3A3]">
                  <span className="text-[#1F2937] dark:text-[#E5E5E5]">{REGISTRY_LABEL[entry.registry_type]}</span>
                  {" · "}
                  {entrySubtitle(entry)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  onClick={() => router.push(`${listBase}/${entry.id}`)}
                  title="Open as a full page"
                  aria-label="Open as a full page"
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-[#9CA3AF] dark:text-[#A3A3A3] transition hover:bg-[#F4F5F7] dark:hover:bg-[#1F1F1F] hover:text-[#1F2937] dark:hover:text-white"
                >
                  <ExternalLink size={15} />
                </button>
                <SheetClose />
              </div>
            </SheetHeader>

            <SheetBody>
              {removeError && (
                <p className="mb-4 text-[13px] text-[#DC2626] dark:text-[#F87171]">{removeError}</p>
              )}
              <RegistryEntryView entry={entry} />
            </SheetBody>

            <SheetFooter className="justify-between">
              {can("registries:delete") ? (
                <button
                  onClick={() => setConfirming(true)}
                  disabled={deleting}
                  className="rounded-lg px-2 py-1.5 text-[13px] font-medium text-[#6B7280] transition hover:text-[#DC2626] disabled:opacity-50 dark:text-[#A3A3A3] dark:hover:text-[#F87171]"
                >
                  Remove from registry
                </button>
              ) : (
                <span />
              )}
              <button
                onClick={() => router.push(`/residents/${entry.resident.id}`)}
                className="rounded-lg bg-(--brand) px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-(--brand-hover)"
              >
                Open RBI profile
              </button>
            </SheetFooter>
          </div>
        )}
      </SheetContent>

      <ConfirmDialog
        open={confirming}
        title="Remove from registry?"
        message={
          entry
            ? `${displayName(entry.resident)} will be taken off the ${title} registry. Their RBI record and other records stay as they are.`
            : ""
        }
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
        onConfirm={handleRemove}
        onCancel={() => setConfirming(false)}
      />
    </Sheet>
  );
}