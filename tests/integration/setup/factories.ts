// FILE: tests/integration/setup/factories.ts
//
// Thin, real-DB factory functions for integration tests. Every function
// here (a) inserts exactly one row via the real Prisma client, and
// (b) immediately registers how to delete it with trackCleanup() — see
// db.ts for the cleanup model and why it's tracked-deletion rather than
// a DB reset or transaction rollback.
//
// Each factory takes a Partial<> of overrides so a test can be explicit
// about the one or two fields it actually cares about, while getting
// unique-enough defaults for everything else — names/usernames/numbers
// include a timestamp + random suffix so parallel test files (or two
// runs in quick succession) never collide on a real unique constraint.

import bcrypt from "bcryptjs";
import { testDb, trackCleanup } from "./db";
import type { CivilStatus, Role } from "@prisma/client";

let counter = 0;
function unique(prefix: string) {
  counter += 1;
  return `${prefix}_${Date.now()}_${counter}_${Math.floor(Math.random() * 10_000)}`;
}

// ── Users ────────────────────────────────────────────────────────────────
export async function createTestUser(
  overrides: Partial<{
    username: string;
    password: string;
    role: Role;
    is_active: boolean;
  }> = {}
) {
  const password = overrides.password ?? "TestPassword123!";
  const user = await testDb.user.create({
    data: {
      username: overrides.username ?? unique("itest_user"),
      // Cost factor 4 (vs. the app's real 10+) — these hashes only ever
      // need to be correct, not slow, and this suite hashes one per test.
      password_hash: await bcrypt.hash(password, 4),
      role: overrides.role ?? "ADMIN",
      is_active: overrides.is_active ?? true,
    },
  });
  trackCleanup(() => testDb.user.delete({ where: { id: user.id } }).then(() => {}));
  return { ...user, plainPassword: password };
}

// ── Puroks ───────────────────────────────────────────────────────────────
export async function createTestPurok(overrides: Partial<{ name: string }> = {}) {
  const purok = await testDb.purok.create({
    data: { name: overrides.name ?? unique("Test Purok") },
  });
  trackCleanup(() => testDb.purok.delete({ where: { id: purok.id } }).then(() => {}));
  return purok;
}

// ── Households ───────────────────────────────────────────────────────────
export async function createTestHousehold(
  overrides: Partial<{
    purok_id: number;
    address: string;
    household_head_id: number | null;
  }> = {}
) {
  const purok_id = overrides.purok_id ?? (await createTestPurok()).id;
  const household = await testDb.household.create({
    data: {
      household_no: unique("HH-ITEST"),
      purok_id,
      address: overrides.address ?? "123 Test Street",
      household_head_id: overrides.household_head_id ?? null,
    },
  });
  trackCleanup(() => testDb.household.delete({ where: { id: household.id } }).then(() => {}));
  return household;
}

// ── Residents ────────────────────────────────────────────────────────────
export async function createTestResident(
  overrides: Partial<{
    household_id: number | null;
    purok_id: number | null;
    fname: string;
    lname: string;
    sex: "MALE" | "FEMALE";
    civil_status: CivilStatus;
    birthdate: Date;
    created_at: Date;
    is_archived: boolean;
  }> = {}
) {
  const resident = await testDb.resident.create({
    data: {
      fname: overrides.fname ?? "Juan",
      lname: overrides.lname ?? unique("DelaCruz"),
      birthdate: overrides.birthdate ?? new Date("1990-01-01"),
      sex: overrides.sex ?? "MALE",
      civil_status: overrides.civil_status ?? "SINGLE",
      household_id: overrides.household_id ?? null,
      purok_id: overrides.purok_id ?? null,
      is_archived: overrides.is_archived ?? false,
      // A resident created "just now" legitimately fails the
      // certificates route's 6-month residency check — that's real
      // business logic, not a test artifact. Tests that need a
      // certificate-eligible resident should pass
      // `created_at: residencyEligibleDate()` explicitly.
      ...(overrides.created_at ? { created_at: overrides.created_at } : {}),
    },
  });
  trackCleanup(() => testDb.resident.delete({ where: { id: resident.id } }).then(() => {}));
  return resident;
}

/** A `created_at` far enough in the past to clear the certificates route's 6-month residency check. */
export function residencyEligibleDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - 7);
  return d;
}

// ── Certificates ─────────────────────────────────────────────────────────
export async function createTestCertificate(
  overrides: Partial<{
    resident_id: number | null;
    issued_by: number;
    certificate_type: string;
    purpose: string;
    status: string;
    payment_status: string;
    certificate_no: string;
    queue_number: string;
    requested_at: Date;
  }> = {}
) {
  const issued_by = overrides.issued_by ?? (await createTestUser()).id;
  const certificate = await testDb.certificate.create({
    data: {
      certificate_no: overrides.certificate_no ?? unique("CERT-ITEST"),
      queue_number: overrides.queue_number ?? unique("Q-ITEST"),
      resident_id: overrides.resident_id ?? null,
      issued_by,
      certificate_type: (overrides.certificate_type as any) ?? "RESIDENCY",
      purpose: overrides.purpose ?? "Integration test",
      status: (overrides.status as any) ?? "PENDING",
      payment_status: (overrides.payment_status as any) ?? "PENDING",
      ...(overrides.requested_at ? { requested_at: overrides.requested_at } : {}),
    },
  });
  trackCleanup(() => testDb.certificate.delete({ where: { id: certificate.id } }).then(() => {}));
  return certificate;
}