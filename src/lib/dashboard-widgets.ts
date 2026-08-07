// FILE: src/lib/dashboard-widgets.ts
//
// Single source of truth for the Dashboard Customization feature (spec
// 2.12) — shared between the API route (src/app/api/dashboard-preferences)
// and the dashboard page / Customize panel, so the widget list and each
// role's default layout only need to be defined once.

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

export const PANEL_WIDGET_DESCRIPTIONS: Record<
  "quick_actions" | "priority_tasks" | "activity_feed" | "document_status_chart",
  string
> = {
  quick_actions: "Frequently used action buttons",
  priority_tasks: "Role-based pending tasks",
  activity_feed: "Recent system activity",
  document_status_chart: "Breakdown of document requests by status",
};

// Role's default enabled widgets, roughly tracking what each role actually
// *writes to* per src/lib/permission.ts (not just what it can read) — e.g.
// BHW's writes are registries/health/visitors, so that's what shows by
// default, while CAPTAIN/SECRETARY (broad write access) default to
// everything on.
type Role = "ADMIN" | "CAPTAIN" | "SECRETARY" | "KAGAWAD" | "BHW" | "ENCODER";

export const ROLE_DEFAULT_WIDGETS: Record<Role, WidgetKey[]> = {
  ADMIN: [...ALL_WIDGET_KEYS],
  CAPTAIN: [...ALL_WIDGET_KEYS],
  SECRETARY: [...ALL_WIDGET_KEYS],
  KAGAWAD: [
    "kpi_residents", "kpi_blotter_cases", "kpi_settled_cases", "kpi_meetings_today",
    "priority_tasks", "activity_feed",
  ],
  BHW: [
    "kpi_residents", "kpi_visitors",
    "priority_tasks", "activity_feed",
  ],
  ENCODER: [
    "kpi_residents", "kpi_document_requests", "kpi_visitors",
    "quick_actions", "activity_feed",
  ],
};

export function isWidgetEnabledByDefault(role: string, widgetKey: WidgetKey): boolean {
  const defaults = ROLE_DEFAULT_WIDGETS[role as Role];
  if (!defaults) return false;
  return defaults.includes(widgetKey);
}