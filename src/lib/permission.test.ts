// FILE: src/lib/permission.test.ts
//
// Locks in the access policy approved in Nov 2026 (see the header of
// ./permission.ts). If one of these fails, the policy changed — update it
// only with the barangay's sign-off.
import { describe, it, expect } from 'vitest';
import { hasPermission, isViewOnly, ROLES } from './permission';

// Every resource the API checks (see requirePermission calls in src/app/api).
const RESOURCES = [
  'residents', 'households', 'deceased', 'registries', 'certificates', 'barangay_id', 'blotter',
  'incident-types', 'health', 'equipment', 'financial', 'fund-sources', 'appropriations', 'revenues',
  'disbursements', 'meetings', 'calendar', 'officials', 'visitors', 'users', 'settings', 'backup',
];

const can = (role: string, resource: string, action: 'read' | 'write' | 'delete') =>
  hasPermission(role, `${resource}:${action}`);

describe('access policy — full access', () => {
  for (const role of ['ADMIN', 'SECRETARY']) {
    it(`${role} can view, add/edit and delete everything, including users, settings and backups`, () => {
      for (const r of RESOURCES) {
        expect(can(role, r, 'read')).toBe(true);
        expect(can(role, r, 'write')).toBe(true);
        expect(can(role, r, 'delete')).toBe(true);
      }
      expect(hasPermission(role, 'audit-logs:read')).toBe(true);
      expect(isViewOnly(role)).toBe(false);
    });
  }
});

describe('access policy — Encoder', () => {
  const EDITS = ['residents', 'households', 'certificates', 'barangay_id', 'visitors'];

  it('adds and edits residents, households, certificates, Barangay ID and the visitor log', () => {
    for (const r of EDITS) expect(can('ENCODER', r, 'write')).toBe(true);
  });

  it('cannot delete, archive or cancel anything', () => {
    for (const r of RESOURCES) expect(can('ENCODER', r, 'delete')).toBe(false);
  });

  it('cannot edit anything else', () => {
    for (const r of RESOURCES.filter((r) => !EDITS.includes(r))) expect(can('ENCODER', r, 'write')).toBe(false);
  });

  it('keeps the same viewing access as before (no finances, meetings, officials or reports)', () => {
    for (const r of ['blotter', 'health', 'equipment', 'certificates']) expect(can('ENCODER', r, 'read')).toBe(true);
    for (const r of ['financial', 'fund-sources', 'meetings', 'officials', 'users', 'settings']) expect(can('ENCODER', r, 'read')).toBe(false);
    expect(hasPermission('ENCODER', 'reports:read')).toBe(false);
  });
});

describe('access policy — BHW', () => {
  it('adds and edits health records and vaccinations only', () => {
    expect(can('BHW', 'health', 'write')).toBe(true);
    for (const r of RESOURCES.filter((r) => r !== 'health')) expect(can('BHW', r, 'write')).toBe(false);
  });

  it('cannot delete anything, health records included', () => {
    for (const r of RESOURCES) expect(can('BHW', r, 'delete')).toBe(false);
  });

  it('no longer edits registries', () => {
    expect(can('BHW', 'registries', 'write')).toBe(false);
    expect(can('BHW', 'registries', 'read')).toBe(true);
  });

  it('still cannot see blotter cases, certificates, finances, equipment or meetings', () => {
    for (const r of ['blotter', 'certificates', 'financial', 'equipment', 'meetings']) expect(can('BHW', r, 'read')).toBe(false);
  });
});

describe('access policy — view only', () => {
  for (const role of ['CAPTAIN', 'KAGAWAD']) {
    it(`${role} can view every operational module but change nothing`, () => {
      for (const r of RESOURCES.filter((r) => !['users', 'settings', 'backup'].includes(r))) {
        expect(can(role, r, 'read')).toBe(true);
      }
      for (const r of RESOURCES) {
        expect(can(role, r, 'write')).toBe(false);
        expect(can(role, r, 'delete')).toBe(false);
      }
      expect(isViewOnly(role)).toBe(true);
    });
  }

  it('lets the Captain look at users, settings and the audit log (oversight), but not the Kagawad', () => {
    for (const p of ['users:read', 'settings:read', 'audit-logs:read']) {
      expect(hasPermission('CAPTAIN', p)).toBe(true);
      expect(hasPermission('KAGAWAD', p)).toBe(false);
    }
    expect(hasPermission('CAPTAIN', 'backup:write')).toBe(false);
  });
});

describe('everyone', () => {
  it('can customise their own dashboard layout', () => {
    for (const role of ROLES) expect(hasPermission(role, 'dashboard-preferences:write')).toBe(true);
  });

  it('only Encoder and BHW are partly editable; Captain and Kagawad are view-only', () => {
    expect(ROLES.filter(isViewOnly).sort()).toEqual(['CAPTAIN', 'KAGAWAD']);
  });
});

describe('hasPermission', () => {
  it('returns false for an unknown role', () => {
    expect(hasPermission('RANDOM_ROLE', 'residents:read')).toBe(false);
    expect(isViewOnly('RANDOM_ROLE')).toBe(true);
  });
});