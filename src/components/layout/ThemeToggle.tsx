// src/components/layout/ThemeToggle.tsx
//
// The light/dark switch — a two-icon segmented control (sun | moon) like
// the reference screenshot, styled to match the other icon buttons
// already in Topbar.tsx (h-9, rounded-lg, same hover treatment) rather
// than introducing a new visual pattern.
"use client";

import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex items-center gap-0.5 rounded-lg border border-[#E9EAEC] bg-[#F4F5F7] p-0.5 dark:border-[#262626] dark:bg-[#111111]"
    >
      {/*
        resolvedTheme depends on localStorage / prefers-color-scheme,
        neither of which exist during server rendering — the server has to
        render a guess, and the client corrects it right after mount.
        suppressHydrationWarning tells React that's expected for these two
        nodes specifically, rather than a real bug. React still uses the
        client's correct value post-hydration; this only silences the
        console warning for the one intentional mismatch.
      */}
      <button
        type="button"
        role="radio"
        aria-checked={resolvedTheme === "light"}
        aria-label="Light mode"
        title="Light mode"
        onClick={() => setTheme("light")}
        suppressHydrationWarning
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          resolvedTheme === "light"
            ? "bg-white text-[#1F2937] shadow-sm dark:bg-[#1F1F1F] dark:text-white"
            : "text-[#9CA3AF] hover:text-[#6B7280] dark:hover:text-[#D1D5DB]"
        }`}
      >
        <Sun size={16} />
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={resolvedTheme === "dark"}
        aria-label="Dark mode"
        title="Dark mode"
        onClick={() => setTheme("dark")}
        suppressHydrationWarning
        className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          resolvedTheme === "dark"
            ? "bg-white text-[#1F2937] shadow-sm dark:bg-[#1F1F1F] dark:text-white"
            : "text-[#9CA3AF] hover:text-[#6B7280] dark:hover:text-[#D1D5DB]"
        }`}
      >
        <Moon size={16} />
      </button>
    </div>
  );
}