// FILE: src/components/onboarding/TourOverlay.tsx
//
// Draws the actual tour: a dimmed backdrop with a rectangular "hole" cut
// out around the current step's target element, plus a tooltip card next
// to it. Built as four separate strips (top/bottom/left/right of the
// target) rather than one full-screen div + box-shadow trick, so clicks
// inside the hole genuinely reach the real element underneath — needed
// for steps like "try clicking RBI to expand it".
//
// Each step's target is looked up live via `document.querySelector`
// (see ONBOARDING_STEPS) and re-measured on resize/scroll. If a target
// never appears (e.g. this role's sidebar has no "Documents" group), the
// step is skipped automatically after a short retry window rather than
// stalling the tour.
"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { X, MousePointerClick } from "lucide-react";
import { useOnboarding } from "./OnboardingProvider";
import { ONBOARDING_STEPS, type TourPlacement } from "@/lib/onboarding/steps";

const PAD = 8; // breathing room between the target and the cutout edge
const GAP = 14; // breathing room between the cutout and the tooltip card
const CARD_W = 328;
const CARD_H_ESTIMATE = 220; // for viewport clamping only — actual height can vary a little
const MARGIN = 16; // minimum distance the card keeps from any viewport edge
const RETRY_MS = 150;
const MAX_RETRIES = 6; // ~900ms total — long enough for the dashboard's own
// data fetch to finish rendering KPI/quick-action widgets, short enough
// that a genuinely-missing step (wrong role) doesn't stall the tour.

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

function toRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), Math.max(min, max));
}

function tooltipPosition(rect: Rect, placement: TourPlacement) {
  const hole = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    right: rect.left + rect.width + PAD,
    bottom: rect.top + rect.height + PAD,
  };

  let top: number;
  let left: number;

  switch (placement) {
    case "right":
      top = hole.top;
      left = hole.right + GAP;
      break;
    case "left":
      top = hole.top;
      left = hole.left - GAP - CARD_W;
      break;
    case "top":
      top = hole.top - GAP - CARD_H_ESTIMATE;
      left = hole.left;
      break;
    case "bottom":
    default:
      top = hole.bottom + GAP;
      left = hole.left;
      break;
  }

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  return {
    top: clamp(top, MARGIN, vh - CARD_H_ESTIMATE - MARGIN),
    left: clamp(left, MARGIN, vw - CARD_W - MARGIN),
  };
}

export default function TourOverlay() {
  const { isActive, stepIndex, totalSteps, next, prev, close } = useOnboarding();
  const [rect, setRect] = useState<Rect | null>(null);
  const retriesRef = useRef(0);
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const step = ONBOARDING_STEPS[stepIndex];
  const isLast = stepIndex === totalSteps - 1;
  const isFirst = stepIndex === 0;

  // Resolve + track the current step's target element.
  useEffect(() => {
    if (!isActive) {
      return;
    }
    retriesRef.current = 0;
    let cancelled = false;
    let retryTimer: number | undefined;
    let scrolledIn = false;

    function measure() {
      const el = document.querySelector(step.target);
      if (!el) {
        retriesRef.current += 1;
        if (retriesRef.current > MAX_RETRIES) {
          // Not available for this role/page — skip it rather than stall.
          if (isLast) close();
          else next();
          return;
        }
        retryTimer = window.setTimeout(measure, RETRY_MS);
        return;
      }
      if (!scrolledIn) {
        scrolledIn = true;
        el.scrollIntoView({ block: "center", behavior: "smooth" });
      }
      if (!cancelled) setRect(toRect(el));
    }

    const measureFrame = window.requestAnimationFrame(measure);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(measureFrame);
      if (retryTimer) window.clearTimeout(retryTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stepIndex]);

  // Keep the cutout/card glued to the target while scrolling/resizing.
  useEffect(() => {
    if (!isActive || !rect) return;
    function reMeasure() {
      const el = document.querySelector(step.target);
      if (el) setRect(toRect(el));
    }
    window.addEventListener("resize", reMeasure);
    window.addEventListener("scroll", reMeasure, true); // capture: catches the sidebar's own scroll container too
    return () => {
      window.removeEventListener("resize", reMeasure);
      window.removeEventListener("scroll", reMeasure, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, stepIndex, !!rect]);

  // Escape closes the tour like any other dismissible overlay in the app.
  useEffect(() => {
    if (!isActive) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isActive, close]);

  if (!mounted || !isActive || !rect) return null;

  const hole = {
    top: rect.top - PAD,
    left: rect.left - PAD,
    width: rect.width + PAD * 2,
    height: rect.height + PAD * 2,
  };
  const pos = tooltipPosition(rect, step.placement);

  return createPortal(
    <div aria-live="polite" role="dialog" aria-label="Product tour">
      {/* Four dimmed strips around the hole — deliberately not one div with
          a huge box-shadow, so clicks inside the hole reach the real page. */}
      <div className="fixed inset-x-0 top-0 z-100 bg-black/55 transition-[height] duration-150" style={{ height: Math.max(hole.top, 0) }} />
      <div className="fixed inset-x-0 bottom-0 z-100 bg-black/55 transition-[top] duration-150" style={{ top: hole.top + hole.height }} />
      <div className="fixed left-0 z-100 bg-black/55 transition-all duration-150" style={{ top: hole.top, height: hole.height, width: Math.max(hole.left, 0) }} />
      <div className="fixed right-0 z-100 bg-black/55 transition-all duration-150" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }} />

      {/* Decorative highlight ring — non-interactive, sits on top of the hole */}
      <div
        className="pointer-events-none fixed z-101 rounded-xl ring-2 ring-[#0B6E4F] dark:ring-[#34A37A] transition-all duration-150"
        style={{ top: hole.top, left: hole.left, width: hole.width, height: hole.height, boxShadow: "0 0 0 4px rgba(11,110,79,0.15)" }}
      />

      {/* Tooltip card */}
      <div
        className="fixed z-102 w-82 rounded-xl border border-[#E9EAEC] bg-white p-5 shadow-2xl dark:border-[#333333] dark:bg-[#171717]"
        style={{ top: pos.top, left: pos.left }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="text-[10.5px] font-bold uppercase tracking-widest text-[#0B6E4F] dark:text-[#34A37A]">
            Step {stepIndex + 1} of {totalSteps}
          </span>
          <button
            type="button"
            onClick={close}
            aria-label="Close tour"
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[#9CA3AF] transition hover:bg-[#F4F5F7] hover:text-[#1F2937] dark:hover:bg-[#1F1F1F] dark:hover:text-white"
          >
            <X size={14} />
          </button>
        </div>

        <h3 className="mt-2 text-[15px] font-bold leading-snug text-[#1B2430] dark:text-white">{step.title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[#4B5563] dark:text-[#D4D4D4]">{step.body}</p>

        {step.hint && (
          <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-[#E8F3EE] px-3 py-2 text-[12px] font-medium text-[#0B6E4F] dark:bg-[#11321F]/60 dark:text-[#34A37A]">
            <MousePointerClick size={13} className="mt-0.5 shrink-0" />
            {step.hint}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1">
            {ONBOARDING_STEPS.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === stepIndex ? "w-4 bg-[#0B6E4F] dark:bg-[#34A37A]" : "w-1.5 bg-[#E9EAEC] dark:bg-[#333333]"
                }`}
              />
            ))}
          </div>
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={prev}
                className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-[#6B7280] transition hover:bg-[#F4F5F7] dark:text-[#A3A3A3] dark:hover:bg-[#1F1F1F]"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={isLast ? close : next}
              className="rounded-lg bg-[#0B6E4F] px-4 py-1.5 text-[12px] font-bold text-white transition hover:bg-[#0A5C42] dark:bg-[#34A37A] dark:text-[#0A0A0A] dark:hover:bg-[#2E9169]"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={close}
          className="mt-3 w-full text-center text-[11px] font-medium text-[#9CA3AF] transition hover:text-[#6B7280] dark:hover:text-[#D4D4D4]"
        >
          Skip tour
        </button>
      </div>
    </div>,
    document.body
  );
}