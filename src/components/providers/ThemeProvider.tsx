// src/components/providers/ThemeProvider.tsx
//
// Light/dark mode context. Persists the user's choice to localStorage
// (key: "rms-theme") and applies it by toggling a `dark` class on
// <html> — paired with the `@custom-variant dark (&:where(.dark, .dark
// *));` line in globals.css, which is what makes Tailwind's `dark:`
// utility respect that class instead of only the OS-level
// prefers-color-scheme media query. That's what lets the toggle actually
// override the system setting rather than just following it.
//
// The actual "flip the class" logic also runs synchronously via an
// inline <script> in the root layout's <head> (see src/app/layout.tsx) —
// this context is for components that need to READ/CHANGE the current
// theme (the toggle button, etc.), not for the very first paint, since a
// React effect here would run one tick too late and cause a
// flash-of-wrong-theme on every load.
"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "rms-theme";

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function resolve(theme: Theme): "light" | "dark" {
  return theme === "system" ? (getSystemPrefersDark() ? "dark" : "light") : theme;
}

function applyToDocument(resolved: "light" | "dark") {
  document.documentElement.classList.toggle("dark", resolved === "dark");
  document.documentElement.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Read the class the inline <head> script already applied on first
  // paint, rather than defaulting to "light" and flashing — the DOM is
  // already correct by the time React hydrates, we're just syncing state
  // to match it.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem(STORAGE_KEY) as Theme | null) ?? "system";
  });
  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    if (typeof window === "undefined") return "light";
    return document.documentElement.classList.contains("dark") ? "dark" : "light";
  });

  function setTheme(next: Theme) {
    localStorage.setItem(STORAGE_KEY, next);
    setThemeState(next);
    const resolved = resolve(next);
    setResolvedTheme(resolved);
    applyToDocument(resolved);
  }

  function toggleTheme() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  }

  // Keep in sync with OS-level changes while `theme === "system"`.
  useEffect(() => {
    if (theme !== "system") return;
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    function handleChange() {
      const resolved = getSystemPrefersDark() ? "dark" : "light";
      setResolvedTheme(resolved);
      applyToDocument(resolved);
    }
    mql.addEventListener("change", handleChange);
    return () => mql.removeEventListener("change", handleChange);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}