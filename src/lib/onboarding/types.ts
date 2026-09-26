// FILE: src/lib/onboarding/types.ts
//
// Shared between the general dashboard-overview tour (steps.ts) and the
// per-page tours (pageTours.ts) so both describe steps the same way.

export type TourPlacement = "top" | "bottom" | "left" | "right";

export interface TourStep {
  id: string;
  /** CSS selector, matched against a `data-tour` attribute in the DOM. */
  target: string;
  placement: TourPlacement;
  title: string;
  body: string;
  /** Short, phrased as something to actually try right now ("Try typing…"). Optional — leave out for purely informational steps. */
  hint?: string;
}