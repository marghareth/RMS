// FILE: src/lib/route-permissions.routes.test.ts
//
// Regression guard for the Barangay ID bug: the pages lived in a folder
// named `barangay_id` while the sidebar, the page-access rules
// (ROUTE_PERMISSIONS) and next.config.ts's redirect all pointed at
// `/barangay-id`. Every link to the module ended in a 404, and because the
// access rule was written for the hyphenated path, the underscored folder
// was never gated either. Nothing failed loudly, so nobody noticed.
//
// These tests read the real files on disk and cross-check them:
//   1. every page under src/app/(dashboard) is covered by a ROUTE_PERMISSIONS
//      entry (or is on the short, explicit list of sign-in-only pages);
//   2. every link in the sidebar resolves to a page that actually exists.

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { findRoutePermission } from './route-permissions';

const APP_DIR = path.resolve(__dirname, '../app');
const DASHBOARD_DIR = path.join(APP_DIR, '(dashboard)');
const SIDEBAR_FILE = path.resolve(__dirname, '../components/layout/Sidebar.tsx');

/**
 * Pages that intentionally have no ROUTE_PERMISSIONS entry — being signed
 * in is enough. Keep this list short and give a reason for each entry.
 */
const SIGNED_IN_ONLY = new Set<string>([
  '/', // just redirects to /login
  '/account/security', // every user manages their own 2FA
  '/admin', // landing page of links only; each linked page is gated
  // Older duplicate of /admin/backup. Its API (GET/POST /api/backup) still
  // requires backup:write, so no data is exposed — but the page should be
  // removed or gated in a follow-up.
  '/backup',
]);

/** Recursively collects every page.tsx and turns its folder path into a URL. */
function collectPageUrls(dir: string, segments: string[] = []): string[] {
  const urls: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const name = entry.name;
      // Route groups like (dashboard) don't appear in the URL.
      const next = name.startsWith('(') && name.endsWith(')') ? segments : [...segments, name];
      urls.push(...collectPageUrls(path.join(dir, name), next));
    } else if (entry.name === 'page.tsx') {
      // Dynamic segments ([id], [type]) become a sample value.
      const url = '/' + segments.map((s) => (s.startsWith('[') ? '1' : s)).join('/');
      urls.push(url === '/' ? '/' : url.replace(/\/$/, ''));
    }
  }
  return urls;
}

/** Same walk, but returns URL patterns with dynamic segments kept as wildcards. */
function collectPagePatterns(dir: string, segments: string[] = []): RegExp[] {
  const patterns: RegExp[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const name = entry.name;
      const next = name.startsWith('(') && name.endsWith(')') ? segments : [...segments, name];
      patterns.push(...collectPagePatterns(path.join(dir, name), next));
    } else if (entry.name === 'page.tsx') {
      const body = segments
        .map((s) => (s.startsWith('[') ? '[^/]+' : s.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&')))
        .join('/');
      patterns.push(new RegExp(`^/${body}$`));
    }
  }
  return patterns;
}

describe('dashboard pages vs ROUTE_PERMISSIONS', () => {
  const urls = collectPageUrls(DASHBOARD_DIR);

  it('finds the dashboard pages on disk', () => {
    // Sanity check so a moved folder can't make the next test pass vacuously.
    expect(urls.length).toBeGreaterThan(50);
  });

  it('every dashboard page is covered by a page-access rule', () => {
    const ungated = urls.filter((u) => !SIGNED_IN_ONLY.has(u) && findRoutePermission(u) === null);
    expect(ungated).toEqual([]);
  });

  it('serves the Barangay ID pages from the hyphenated path the rest of the app uses', () => {
    expect(urls).toContain('/barangay-id');
    expect(urls).toContain('/barangay-id/new');
    expect(urls.some((u) => u.includes('barangay_id'))).toBe(false);
    expect(findRoutePermission('/barangay-id')).toBe('barangay_id:read');
    expect(findRoutePermission('/barangay-id/new')).toBe('barangay_id:read');
  });
});

describe('sidebar links vs pages on disk', () => {
  const patterns = collectPagePatterns(APP_DIR);
  const sidebarSource = fs.readFileSync(SIDEBAR_FILE, 'utf8');
  const hrefs = [...sidebarSource.matchAll(/(?:href|addHref):\s*"([^"]+)"/g)].map((m) => m[1]);

  it('finds the sidebar links', () => {
    expect(hrefs.length).toBeGreaterThan(20);
  });

  it('every sidebar link points at a page that exists', () => {
    const broken = hrefs.filter((href) => !patterns.some((re) => re.test(href)));
    expect(broken).toEqual([]);
  });
});