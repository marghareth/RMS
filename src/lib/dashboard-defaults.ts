// FILE: src/lib/dashboard-defaults.ts
//
// Role-based default widget visibility for Batch 11 (Dashboard Customization).
// A user's actual preferences (DashboardPreference rows) always win; these
// defaults only fill in widget_keys the user has never toggled — and are
// what "Reset to Role Defaults" restores.

export type WidgetKey =
  | "kpi_residents"
  | "kpi_document_requests"
  | "kpi_blotter_cases"
  | "kpi_visitors"
  | "kpi_meetings_today"
  | "kpi_assets"
  | "kpi_settled_cases"
  | "quick_actions"
  | "priority_tasks"
  | "activity_feed"
  | "document_status_chart";

export const ALL_WIDGET_KEYS: WidgetKey[] = [
  "kpi_residents",
  "kpi_document_requests",
  "kpi_blotter_cases",
  "kpi_visitors",
  "kpi_meetings_today",
  "kpi_assets",
  "kpi_settled_cases",
  "quick_actions",
  "priority_tasks",
  "activity_feed",
  "document_status_chart",
];

export const KPI_WIDGET_KEYS: WidgetKey[] = [
  "kpi_residents",
  "kpi_document_requests",
  "kpi_blotter_cases",
  "kpi_visitors",
  "kpi_meetings_today",
  "kpi_assets",
  "kpi_settled_cases",
];

export const WIDGET_LABELS: Record<WidgetKey, string> = {
  kpi_residents: "Residents",
  kpi_document_requests: "Document Requests",
  kpi_blotter_cases: "Blotter Cases",
  kpi_visitors: "Visitors",
  kpi_meetings_today: "Meetings Today",
  kpi_assets: "Assets",
  kpi_settled_cases: "Settled Cases",
  quick_actions: "Quick Actions",
  priority_tasks: "Priority Tasks",
  activity_feed: "Activity Feed",
  document_status_chart: "Document Status Chart",
};

export type DashboardPreferenceMap = Record<WidgetKey, boolean>;

const ALL_ON: DashboardPreferenceMap = ALL_WIDGET_KEYS.reduce((acc, k) => {
  acc[k] = true;
  return acc;
}, {} as DashboardPreferenceMap);

// Per-role defaults. Roles not listed fall back to ALL_ON. Each entry only
// needs to override what differs from ALL_ON.
const ROLE_OVERRIDES: Partial<Record<string, Partial<DashboardPreferenceMap>>> = {
  BHW: {
    kpi_document_requests: false,
    kpi_blotter_cases: false,
    kpi_settled_cases: false,
    document_status_chart: false,
  },
  ENCODER: {
    kpi_blotter_cases: false,
    kpi_settled_cases: false,
    priority_tasks: false,
  },
  KAGAWAD: {
    kpi_document_requests: false,
    kpi_assets: false,
  },
};

export function getRoleDefaults(role: string): DashboardPreferenceMap {
  const overrides = ROLE_OVERRIDES[role] ?? {};
  return { ...ALL_ON, ...overrides };
}