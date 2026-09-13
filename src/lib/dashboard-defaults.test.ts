// FILE: src/lib/dashboard-defaults.test.ts
import { describe, it, expect } from 'vitest';
import { getRoleDefaults, ALL_WIDGET_KEYS, WIDGET_LABELS, KPI_WIDGET_KEYS } from './dashboard-defaults';

describe('getRoleDefaults', () => {
  it('turns every widget on for a role with no overrides (e.g. ADMIN)', () => {
    const defaults = getRoleDefaults('ADMIN');
    for (const key of ALL_WIDGET_KEYS) {
      expect(defaults[key]).toBe(true);
    }
  });

  it('turns every widget on for an unrecognized role (falls back to ALL_ON)', () => {
    const defaults = getRoleDefaults('SOME_NEW_ROLE');
    for (const key of ALL_WIDGET_KEYS) {
      expect(defaults[key]).toBe(true);
    }
  });

  it('applies BHW overrides while leaving everything else on', () => {
    const defaults = getRoleDefaults('BHW');
    expect(defaults.kpi_document_requests).toBe(false);
    expect(defaults.kpi_blotter_cases).toBe(false);
    expect(defaults.kpi_settled_cases).toBe(false);
    expect(defaults.document_status_chart).toBe(false);
    // Unmentioned widgets remain on
    expect(defaults.kpi_residents).toBe(true);
    expect(defaults.quick_actions).toBe(true);
  });

  it('applies ENCODER overrides', () => {
    const defaults = getRoleDefaults('ENCODER');
    expect(defaults.kpi_blotter_cases).toBe(false);
    expect(defaults.kpi_settled_cases).toBe(false);
    expect(defaults.priority_tasks).toBe(false);
    expect(defaults.kpi_residents).toBe(true);
  });

  it('applies KAGAWAD overrides', () => {
    const defaults = getRoleDefaults('KAGAWAD');
    expect(defaults.kpi_document_requests).toBe(false);
    expect(defaults.kpi_assets).toBe(false);
    expect(defaults.kpi_residents).toBe(true);
  });

  it('returns a value for every known widget key regardless of role', () => {
    for (const role of ['ADMIN', 'CAPTAIN', 'SECRETARY', 'KAGAWAD', 'BHW', 'ENCODER']) {
      const defaults = getRoleDefaults(role);
      for (const key of ALL_WIDGET_KEYS) {
        expect(typeof defaults[key]).toBe('boolean');
      }
    }
  });
});

describe('widget metadata', () => {
  it('has a label for every widget key', () => {
    for (const key of ALL_WIDGET_KEYS) {
      expect(WIDGET_LABELS[key]).toBeTruthy();
    }
  });

  it('KPI widget keys are a subset of all widget keys', () => {
    for (const key of KPI_WIDGET_KEYS) {
      expect(ALL_WIDGET_KEYS).toContain(key);
    }
  });
});