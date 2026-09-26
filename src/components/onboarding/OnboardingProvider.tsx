// FILE: src/components/onboarding/OnboardingProvider.tsx
//
// Owns all onboarding-tour STATE — the beginner prompt, which tour and
// step is showing, active or not. Drives TWO kinds of tour:
//   1. The GENERAL tour (steps.ts) — shown once via the beginner prompt on
//      a user's first /dashboard visit.
//   2. PER-PAGE tours (pageTours.ts) — auto-launched once per user, per
//      page, the first time they visit a page that has one registered,
//      but ONLY for users who've opted into guided tours (answered "yes"
//      on the beginner prompt, or manually started a tour at least once).
//      A user who said "no" gets neither kind automatically — but can
//      still pull up either one manually via the "?" menu in Topbar.
//
// Actual rendering lives in BeginnerPromptModal.tsx and TourOverlay.tsx,
// both of which read this context via useOnboarding().
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
import { findPageTour, type PageTour } from "@/lib/onboarding/pageTours";
import type { TourStep } from "@/lib/onboarding/types";

const GENERAL_TOUR_ID = "general";

interface OnboardingContextValue {
  /** A tour (general or per-page) is currently showing. */
  isActive: boolean;
  /** The "are you new here?" prompt is currently showing. */
  promptOpen: boolean;
  stepIndex: number;
  /** Steps of whichever tour is currently active. */
  steps: TourStep[];
  totalSteps: number;
  /** The page tour registered for the route the user is on right now, if any — used to decide whether to show "Tour this page" in the Help menu. */
  currentPageTour: PageTour | undefined;
  /** Start the general dashboard-overview tour directly, skipping the beginner prompt. */
  start: () => void;
  /** Start the tour registered for the current page, if any. No-op if none is registered. */
  startPageTour: () => void;
  /** User answered "yes" on the beginner prompt — closes it and starts the general tour. */
  answerYes: () => void;
  /** User answered "no" — closes the prompt, remembers the choice, no tour starts. */
  answerNo: () => void;
  next: () => void;
  prev: () => void;
  close: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// All keys scoped per username (not per-browser) so on a shared front-desk
// computer, one staff account's choices don't silently apply to the next
// person who logs in there.

// "yes" | "no" once the user has answered the beginner prompt (or started
// a tour manually before ever being asked) — absent means "never asked".
function decisionKey(username: string) {
  return `rms-onboarding-decision:${username}`;
}
function readDecision(username: string): "yes" | "no" | null {
  try {
    const v = window.localStorage.getItem(decisionKey(username));
    return v === "yes" || v === "no" ? v : null;
  } catch {
    return null;
  }
}
function writeDecision(username: string, value: "yes" | "no") {
  try {
    window.localStorage.setItem(decisionKey(username), value);
  } catch {
    // Private-browsing / storage-disabled — non-fatal, prompts/tours will
    // just reoffer themselves next session. Manual replay still works.
  }
}

// Present once a given page tour has been shown (finished or skipped) for
// this user — never auto-shown again for that page, replayable manually.
function pageSeenKey(username: string, pageTourId: string) {
  return `rms-onboarding-page-seen:${username}:${pageTourId}`;
}
function readPageSeen(username: string, pageTourId: string): boolean {
  try {
    return !!window.localStorage.getItem(pageSeenKey(username, pageTourId));
  } catch {
    return true; // fail closed — don't re-show on every load if storage is broken
  }
}
function writePageSeen(username: string, pageTourId: string) {
  try {
    window.localStorage.setItem(pageSeenKey(username, pageTourId), "1");
  } catch {
    // non-fatal
  }
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const username = (session?.user as { username?: string } | undefined)?.username;

  const [isActive, setIsActive] = useState(false);
  const [promptOpen, setPromptOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  // Which tour is currently loaded: the general one, or one page tour's id.
  const [activeTourId, setActiveTourId] = useState<string>(GENERAL_TOUR_ID);
  const [activeSteps, setActiveSteps] = useState<TourStep[]>(ONBOARDING_STEPS);

  const currentPageTour = useMemo(() => findPageTour(pathname), [pathname]);

  // Admin-level switch (Admin → Settings → Guided Tour) — governs only
  // whether the beginner prompt itself is offered automatically. See
  // /api/settings/branding. Defaults to "on" until it loads.
  const [tourEnabledSitewide, setTourEnabledSitewide] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/settings/branding")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        if (!cancelled && typeof data?.onboarding_tour_enabled === "boolean") {
          setTourEnabledSitewide(data.onboarding_tour_enabled);
        }
      })
      .catch(() => {
        // Non-fatal — keeps the default (enabled) if the setting can't load.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Ask once per user: the first time a signed-in user with no recorded
  // decision lands on /dashboard, and only while the sitewide setting
  // allows it.
  useEffect(() => {
    if (status !== "authenticated" || !username) return;
    if (pathname !== "/dashboard") return;
    if (!tourEnabledSitewide) return;
    if (readDecision(username) !== null) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) setPromptOpen(true);
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [status, username, pathname, tourEnabledSitewide]);

  // Auto-launch a page tour: only for users who've already opted into
  // guided tours in general (decision === "yes"), the first time they
  // land on a page that has one, and only if nothing else is already
  // showing. Intentionally NOT gated on tourEnabledSitewide — that
  // setting is specifically about whether the initial prompt gets
  // offered; a user who already said yes keeps getting guided page by
  // page even if an admin later turns the prompt off for new users.
  useEffect(() => {
    if (status !== "authenticated" || !username) return;
    if (!currentPageTour) return;
    if (readDecision(username) !== "yes") return;
    if (readPageSeen(username, currentPageTour.id)) return;
    if (isActive || promptOpen) return;

    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) {
        setActiveSteps(currentPageTour.steps);
        setActiveTourId(currentPageTour.id);
        setStepIndex(0);
        setIsActive(true);
      }
    }, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [status, username, currentPageTour, isActive, promptOpen]);

  const answerYes = useCallback(() => {
    if (username) writeDecision(username, "yes");
    setPromptOpen(false);
    setActiveSteps(ONBOARDING_STEPS);
    setActiveTourId(GENERAL_TOUR_ID);
    setStepIndex(0);
    setIsActive(true);
  }, [username]);

  const answerNo = useCallback(() => {
    if (username) writeDecision(username, "no");
    setPromptOpen(false);
  }, [username]);

  // Manual replay of the general tour (Help menu → "Dashboard overview")
  // — always works, regardless of the sitewide setting or any earlier answer.
  const start = useCallback(() => {
    setPromptOpen(false);
    setActiveSteps(ONBOARDING_STEPS);
    setActiveTourId(GENERAL_TOUR_ID);
    setStepIndex(0);
    setIsActive(true);
  }, []);

  // Manual replay of whichever tour belongs to the current page (Help
  // menu → "Tour this page"). No-op if the page has none.
  const startPageTour = useCallback(() => {
    if (!currentPageTour) return;
    setPromptOpen(false);
    setActiveSteps(currentPageTour.steps);
    setActiveTourId(currentPageTour.id);
    setStepIndex(0);
    setIsActive(true);
  }, [currentPageTour]);

  const close = useCallback(() => {
    setIsActive(false);
    if (!username) return;
    if (activeTourId === GENERAL_TOUR_ID) {
      if (readDecision(username) === null) writeDecision(username, "yes");
    } else {
      writePageSeen(username, activeTourId);
    }
  }, [username, activeTourId]);

  const next = useCallback(() => {
    setStepIndex((i) => Math.min(i + 1, activeSteps.length - 1));
  }, [activeSteps]);

  const prev = useCallback(() => {
    setStepIndex((i) => Math.max(i - 1, 0));
  }, []);

  const value = useMemo<OnboardingContextValue>(
    () => ({
      isActive,
      promptOpen,
      stepIndex,
      steps: activeSteps,
      totalSteps: activeSteps.length,
      currentPageTour,
      start,
      startPageTour,
      answerYes,
      answerNo,
      next,
      prev,
      close,
    }),
    [isActive, promptOpen, stepIndex, activeSteps, currentPageTour, start, startPageTour, answerYes, answerNo, next, prev, close]
  );

  return <OnboardingContext.Provider value={value}>{children}</OnboardingContext.Provider>;
}

export function useOnboarding(): OnboardingContextValue {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error("useOnboarding must be used within an OnboardingProvider");
  return ctx;
}