// FILE: src/app/(dashboard)/account/profile/page.tsx
//
// Account › Your name (Nov 2026): the signed-in user sets the name and
// position printed on the "Prepared by" line of printed reports.
// Saves through PATCH /api/account/profile.
"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";

const INPUT =
  "w-full rounded-lg border border-[#E9EAEC] bg-white px-3 py-2.5 text-[13px] text-[#1F2937] outline-none transition focus:border-(--brand-line) dark:border-[#333333] dark:bg-[#171717] dark:text-white";

export default function AccountProfilePage() {
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let ignore = false;
    fetch("/api/account/profile")
      .then((r) => (r.ok ? r.json() : null))
      .then((u) => {
        if (ignore) return;
        if (u) {
          setUsername(u.username ?? "");
          setFullName(u.full_name ?? "");
          setPosition(u.position ?? "");
        } else {
          setError("Couldn't load your account. Refresh the page and try again.");
        }
        setLoading(false);
      })
      .catch(() => {
        if (ignore) return;
        setError("Couldn't reach the server. Check your connection and try again.");
        setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setBusy(true);
    try {
      const res = await fetch("/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, position }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.message || "Couldn't save. Try again.");
        return;
      }
      setFullName(data.full_name ?? "");
      setPosition(data.position ?? "");
      setSaved(true);
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Your name" subtitle="Printed on the “Prepared by” line when you print a report." />

      <form
        onSubmit={handleSubmit}
        className="max-w-md space-y-4 rounded-xl border border-[#E9EAEC] bg-white p-5 dark:border-[#333333] dark:bg-[#171717]"
      >
        <div>
          <label htmlFor="full_name" className="mb-1.5 block text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
            Full name
          </label>
          <input
            id="full_name"
            value={fullName}
            onChange={(e) => {
              setFullName(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. Maria L. Santos"
            maxLength={100}
            disabled={loading}
            autoComplete="name"
            className={INPUT}
          />
        </div>
        <div>
          <label htmlFor="position" className="mb-1.5 block text-[12px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">
            Position
          </label>
          <input
            id="position"
            value={position}
            onChange={(e) => {
              setPosition(e.target.value);
              setSaved(false);
            }}
            placeholder="e.g. Barangay Secretary"
            maxLength={100}
            disabled={loading}
            className={INPUT}
          />
          <p className="mt-1 text-[12px] text-[#9CA3AF] dark:text-[#737373]">Printed under your name. Leave blank to show your role.</p>
        </div>

        {/* What the line will look like on paper */}
        <div className="rounded-lg border border-dashed border-[#E5E7EB] px-4 py-3 dark:border-[#333333]">
          <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">On printed reports</p>
          <p className="mt-2 text-[12px] text-[#374151] dark:text-[#D4D4D4]">Prepared by:</p>
          <div className="mt-5 border-b border-[#1F2937] dark:border-[#A3A3A3]" />
          <p className="mt-1 text-[13px] font-semibold text-[#1F2937] dark:text-white">
            {fullName.trim() || <span className="font-normal text-[#9CA3AF]">(no name yet: the line is left blank)</span>}
          </p>
          {position.trim() && <p className="text-[12px] text-[#6B7280] dark:text-[#A3A3A3]">{position.trim()}</p>}
        </div>

        {error && <p className="text-[13px] text-[#DC2626] dark:text-[#F87171]">{error}</p>}

        <div className="flex items-center gap-3 pt-1">
          <button
            type="submit"
            disabled={busy || loading}
            className="rounded-lg bg-(--brand) px-4 py-2.5 text-[13px] font-medium text-white transition hover:bg-(--brand-hover) disabled:opacity-60"
          >
            {busy ? "Saving…" : "Save"}
          </button>
          {saved && <span className="text-[13px] text-[#15803D] dark:text-[#4ADE80]">Saved</span>}
          {username && <span className="ml-auto text-[12px] text-[#9CA3AF] dark:text-[#737373]">Signed in as {username}</span>}
        </div>
      </form>
    </div>
  );
}