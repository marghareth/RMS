// FILE: src/lib/dashboard-widgets.test.ts
import { describe, it, expect } from 'vitest';
import {
  isWidgetEnabledByDefault,
  ROLE_DEFAULT_WIDGETS,
  ALL_WIDGET_KEYS,
  KPI_WIDGET_KEYS,
  WIDGET_LABELS,
  PANEL_WIDGET_DESCRIPTIONS,
} from './dashboard-widgets';

describe('isWidgetEnabledByDefault', () => {
  it('is true for every widget for ADMIN/CAPTAIN/SECRETARY (all widgets on)', () => {
    for (const role of ['ADMIN', 'CAPTAIN', 'SECRETARY']) {
      for (const key of ALL_WIDGET_KEYS) {
        expect(isWidgetEnabledByDefault(role, key)).toBe(true);
      }
    }
  });

  it('reflects BHW\'s narrower widget list', () => {
    expect(isWidgetEnabledByDefault('BHW', 'kpi_residents')).toBe(true);
    expect(isWidgetEnabledByDefault('BHW', 'kpi_visitors')).toBe(true);
    expect(isWidgetEnabledByDefault('BHW', 'kpi_document_requests')).toBe(false);
    expect(isWidgetEnabledByDefault('BHW', 'kpi_blotter_cases')).toBe(false);
  });

  it('reflects ENCODER\'s widget list', () => {
    expect(isWidgetEnabledByDefault('ENCODER', 'quick_actions')).toBe(true);
    expect(isWidgetEnabledByDefault('ENCODER', 'kpi_settled_cases')).toBe(false);
  });

  it('reflects KAGAWAD\'s widget list', () => {
    expect(isWidgetEnabledByDefault('KAGAWAD', 'kpi_blotter_cases')).toBe(true);
    expect(isWidgetEnabledByDefault('KAGAWAD', 'kpi_visitors')).toBe(false);
  });

  it('returns false for an unrecognized role rather than throwing', () => {
    expect(isWidgetEnabledByDefault('GHOST_ROLE', 'kpi_residents')).toBe(false);
  });
});

describe('ROLE_DEFAULT_WIDGETS', () => {
  it('only contains keys drawn from ALL_WIDGET_KEYS for every role', () => {
    for (const widgets of Object.values(ROLE_DEFAULT_WIDGETS)) {
      for (const key of widgets) {
        expect(ALL_WIDGET_KEYS).toContain(key);
      }
    }
  });

  it('has no duplicate widgets within a single role\'s list', () => {
    for (const widgets of Object.values(ROLE_DEFAULT_WIDGETS)) {
      expect(new Set(widgets).size).toBe(widgets.length);
    }
  });
});

describe('widget metadata completeness', () => {
  it('has a label for every widget key', () => {
    for (const key of ALL_WIDGET_KEYS) {
      expect(WIDGET_LABELS[key]).toBeTruthy();
    }
  });

  it('has a panel description for every non-KPI panel widget', () => {
    for (const key of Object.keys(PANEL_WIDGET_DESCRIPTIONS)) {
      expect(PANEL_WIDGET_DESCRIPTIONS[key as keyof typeof PANEL_WIDGET_DESCRIPTIONS]).toBeTruthy();
    }
  });

  it('KPI widget keys are all present in ALL_WIDGET_KEYS', () => {
    for (const key of KPI_WIDGET_KEYS) {
      expect(ALL_WIDGET_KEYS).toContain(key);
    }
  });
});