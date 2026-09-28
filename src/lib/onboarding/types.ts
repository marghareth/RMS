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
  /**
   * How long (ms) to keep looking for `target` before giving up and skipping
   * the step. Defaults to ~900ms, which suits elements that are on screen
   * immediately. Set higher (e.g. 6000) for targets that only render after
   * a data fetch finishes, such as report charts and tables.
   */
  waitMs?: number;
}