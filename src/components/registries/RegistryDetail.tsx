// FILE: src/components/registries/RegistryDetail.tsx
//
// Full-page registry entry view (/registries/*/[id]).
//
// Redesign (Nov 2026): the body is RegistryEntryView, shared with the
// slide-over, so the page and the panel look the same.
//
// BUGFIX (Nov 2026): this page always bounced back to the list because
// /api/registries/[id] was looking up a resident instead of the registry
// entry (fixed in that route). Remove now checks registries:delete and
// reports a failed removal instead of leaving the page as if it had worked.
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import ConfirmDialog from "@/components/shared/ConfirmDialog";
import { useCan } from "@/lib/hooks/useCan";
import RegistryEntryView, {
  REGISTRY_LABEL, displayName, entrySubtitle, type RegistryEntry,
} from "@/components/registries/RegistryEntryView";

interface RegistryDetailProps {
  entryId: number;
  /** Registry name, e.g. "Senior Citizens". */
  title: string;
  /** Kept for the route pages; the redesigned header has no icon tile. */
  icon?: LucideIcon;
  iconBg?: string;
  accentText?: string;
  listBase: string; // e.g. "/registries/senior-citizens"
}

export default function RegistryDetail({ entryId, title, listBase }: RegistryDetailProps) {
  const can = useCan();
  const router = useRouter();
  const [entry, setEntry] = useState<RegistryEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [removeError, setRemoveError] = useState("");

  useEffect(() => {
    let cancelled = false;
    // Defer to a microtask so no setState call runs synchronously within the
    // effect body itself (avoids react-hooks/set-state-in-effect).
    Promise.resolve().then(() => {
      if (cancelled) return;
      setLoading(true);
      fetch(`/api/registries/${entryId}`)
        .then((r) => { if (!r.ok) throw new Error(); return r.json(); })
        .then((data) => { if (!cancelled) setEntry(data); })
        .catch(() => { if (!cancelled) router.push(listBase); })
        .finally(() => { if (!cancelled) setLoading(false); });
    });
    return () => { cancelled = true; };
  }, [entryId, listBase, router]);

  async function handleRemove() {
    setDeleting(true);
    setRemoveError("");
    try {
      // Removes the registry entry only — the resident's RBI record stays.
      const res = await fetch(`/api/registries/${entryId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setRemoveError(data?.message || data?.error || "Couldn't remove this resident from the registry. Please try again.");
        setConfirming(false);
        return;
      }
      router.push(listBase);
    } catch {
      setRemoveError("Couldn't remove this resident from the registry. Please try again.");
      setConfirming(false);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-(--brand-line) border-t-transparent" />
      </div>
    );
  }

  if (!entry) return null;

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <button
            onClick={() => router.push(listBase)}
            aria-label={`Back to ${title}`}
            className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg text-[#6B7280] transition hover:bg-[#F4F5F7] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-[22px] font-semibold leading-tight text-[#1B2430] dark:text-white">{displayName(entry.resident)}</h1>
            <p className="mt-0.5 text-[13px] text-[#6B7280] dark:text-[#A3A3A3]">
              <span className="text-[#1F2937] dark:text-[#E5E5E5]">{REGISTRY_LABEL[entry.registry_type]}</span>
              {" · "}
              {entrySubtitle(entry)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {can("registries:delete") && (
            <button
              onClick={() => setConfirming(true)}
              disabled={deleting}
              className="rounded-lg px-3 py-2 text-[13px] font-medium text-[#6B7280] transition hover:text-[#DC2626] disabled:opacity-50 dark:text-[#A3A3A3] dark:hover:text-[#F87171]"
            >
              Remove from registry
            </button>
          )}
          <button
            onClick={() => router.push(`/residents/${entry.resident.id}`)}
            className="rounded-lg bg-(--brand) px-4 py-2 text-[13px] font-semibold text-white transition hover:bg-(--brand-hover)"
          >
            Open RBI profile
          </button>
        </div>
      </div>

      {removeError && <p className="mb-4 text-[13px] text-[#DC2626] dark:text-[#F87171]">{removeError}</p>}

      <div className="rounded-xl border border-[#E9EAEC] bg-white px-6 py-5 dark:border-[#262626] dark:bg-[#171717]">
        <RegistryEntryView entry={entry} />
      </div>

      <ConfirmDialog
        open={confirming}
        title="Remove from registry?"
        message={`${displayName(entry.resident)} will be taken off the ${title} registry. Their RBI record and other records stay as they are.`}
        confirmLabel="Remove"
        variant="danger"
        loading={deleting}
        onConfirm={handleRemove}
        onCancel={() => setConfirming(false)}
      />
    </div>
  );
}