// FILE: src/components/onboarding/OnboardingProvider.tsx
//
// Owns all onboarding-tour STATE (which step, active or not) — the actual
// spotlight/tooltip rendering lives in TourOverlay.tsx, which reads this
// context. Kept separate so any component under the dashboard layout
// (notably the "?" restart button in Topbar.tsx) can trigger the tour
// via useOnboarding() without needing to know how it's drawn.
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { ONBOARDING_STEPS } from "@/lib/onboarding/steps";

interface OnboardingContextValue {
  isActive: boolean;
  stepIndex: number;
  totalSteps: number;
  start: () => void;
  next: () => void;
  prev: () => void;
  close: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// Scoped per username (not per-browser) so on a shared front-desk computer,
// one staff account finishing the tour doesn't silently skip it for the
// next person who logs in there.
function storageKey(username: string) {
  return `rms-onboarding-completed:${username}`;
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const username = (session?.user as { username?: string } | undefined)?.username;

  const [isActive, setIsActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const markDone = useCallback(() => {
    if (!username) return;
    try {
      window.localStorage.setItem(storageKey(username), "1");
    } catch {
      // Private-browsing / storage-disabled — non-fatal, the tour will
      // just auto-offer itself again next session. The restart button
      // still works regardless.
    }
  }, [username]);

  // Auto-launch once per user: the first time a signed-in user who hasn't
  // completed (or dismissed) the tour lands on /dashboard — the page every
  // login redirects to (see middleware.ts), and the page every step in
  // ONBOARDING_STEPS has a target reachable from.
  useEffect(() => {
    if (status !== "authenticated" || !username) return;
    if (pathname !== "/dashboard") return;

    let alreadyDone = false;
    try {
      alreadyDone = !!window.localStorage.getItem(storageKey(username));
    } catch {
      return; // Can't read storage — don't risk re-showing this every load.
    }
    if (alreadyDone) return;

    // Small delay so the dashboard's own data fetch (KPI strip, quick
    // actions) has a moment to render before the tour starts pointing at
    // things — TourOverlay also retries per-step if a target isn't there
    // yet, this just avoids an awkward flash on the very first step.
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setStepIndex(0);
        setIsActive(true);
      }
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [status, username, pathname]);

  const start = useCallback(() => {
    setStepIndex(0);
    setIsActive(true);
  }, []);

  const close = useCallback(() => {
    setIsActive(false);
    markDone();
  }, [markDone]);

  const next = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, ONBOARDING_STEPS.length - 1));
  }, []);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      isActive,
      stepIndex,
      totalSteps: ONBOARDING_STEPS.length,
      start,
      next,
      prev,
      close,
    }),
    [isActive, stepIndex, start, next, prev, close]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within an OnboardingProvider");
  return ctx;
}