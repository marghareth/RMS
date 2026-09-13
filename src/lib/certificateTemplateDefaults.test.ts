// FILE: src/lib/certificateTemplateDefaults.test.ts
import { describe, it, expect } from 'vitest';
import {
  CERTIFICATE_TYPE_VALUES,
  DEFAULT_CERTIFICATE_TEMPLATES,
} from './certificateTemplateDefaults';

describe('DEFAULT_CERTIFICATE_TEMPLATES', () => {
  it('has an entry for every certificate type', () => {
    for (const type of CERTIFICATE_TYPE_VALUES) {
      expect(DEFAULT_CERTIFICATE_TEMPLATES[type]).toBeDefined();
    }
  });

  it('every template has a non-empty title, body, and closing_line', () => {
    for (const type of CERTIFICATE_TYPE_VALUES) {
      const tpl = DEFAULT_CERTIFICATE_TEMPLATES[type];
      expect(tpl.title.trim().length).toBeGreaterThan(0);
      expect(tpl.body.trim().length).toBeGreaterThan(0);
      expect(tpl.closing_line.trim().length).toBeGreaterThan(0);
    }
  });

  it('every body references the {{full_name}} placeholder', () => {
    for (const type of CERTIFICATE_TYPE_VALUES) {
      expect(DEFAULT_CERTIFICATE_TEMPLATES[type].body).toContain('{{full_name}}');
    }
  });

  it('every closing_line references the standard issuance placeholders', () => {
    for (const type of CERTIFICATE_TYPE_VALUES) {
      const closing = DEFAULT_CERTIFICATE_TEMPLATES[type].closing_line;
      expect(closing).toContain('{{date_issued}}');
      expect(closing).toContain('{{barangay_name}}');
    }
  });

  it('has no stray certificate types beyond CERTIFICATE_TYPE_VALUES', () => {
    const keys = Object.keys(DEFAULT_CERTIFICATE_TEMPLATES);
    expect(keys.sort()).toEqual([...CERTIFICATE_TYPE_VALUES].sort());
  });
});