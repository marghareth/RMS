// FILE: tests/integration/households.integration.test.ts
//
// DB-backed integration tests for /api/households. See
// residents.integration.test.ts for the full explanation of the
// mocking/hoisting pattern and tests/integration/setup/db.ts for the
// cleanup model.

import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { testDb, trackCleanup, cleanupCreatedRows, disconnectTestDb } from "./setup/db";
import { createTestUser, createTestPurok, createTestHousehold, createTestResident } from "./setup/factories";
import { authedAs } from "./setup/auth";

vi.mock("@/lib/db", async () => {
  const { testDb } = await import("./setup/db");
  return { prisma: testDb };
});

const { requirePermission } = vi.hoisted(() => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/session", () => ({ requirePermission }));

import { GET, POST } from "@/app/api/households/route";

describe("Households API (integration)", () => {
  afterEach(async () => {
    requirePermission.mockReset();
    await cleanupCreatedRows();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it("creates a household under a real purok and generates a unique household_no", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    requirePermission.mockResolvedValue(authedAs(admin, "ADMIN"));

    const purok = await createTestPurok();

    const req = new NextRequest("http://localhost/api/households", {
      method: "POST",
      body: JSON.stringify({ purok_id: purok.id, address: "45 Mabini St." }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    trackCleanup(() => testDb.household.delete({ where: { id: body.id } }).then(() => {}));

    expect(body.household_no).toMatch(/^HHNP1\d{9}$/);

    const inDb = await testDb.household.findUnique({ where: { id: body.id } });
    expect(inDb).not.toBeNull();
    expect(inDb!.purok_id).toBe(purok.id);

    const auditRow = await testDb.auditLog.findFirst({
      where: { table_affected: "Household", record_id: body.id, action: "CREATE" },
    });
    expect(auditRow).not.toBeNull();
  });

  it("rejects a household referencing a purok_id that doesn't exist", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    requirePermission.mockResolvedValue(authedAs(admin, "ADMIN"));

    // A purok_id guaranteed not to exist in a fresh test DB.
    const bogusPurokId = 999_999_999;

    const req = new NextRequest("http://localhost/api/households", {
      method: "POST",
      body: JSON.stringify({ purok_id: bogusPurokId, address: "Nowhere" }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("INVALID_PUROK");

    const count = await testDb.household.count({ where: { purok_id: bogusPurokId } });
    expect(count).toBe(0);
  });

  it("lists households scoped to a purok and includes real member residents", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    requirePermission.mockResolvedValue(authedAs(admin, "ADMIN"));

    const purokA = await createTestPurok();
    const purokB = await createTestPurok();

    const householdA = await createTestHousehold({ purok_id: purokA.id });
    await createTestHousehold({ purok_id: purokB.id });
    await createTestResident({ household_id: householdA.id });

    const req = new NextRequest(`http://localhost/api/households?purok_id=${purokA.id}`);
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.households[0].id).toBe(householdA.id);
    expect(body.households[0].members).toHaveLength(1);
  });
});