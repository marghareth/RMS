// FILE: tests/integration/residents.integration.test.ts
//
// DB-backed integration tests for /api/residents and /api/residents/[id].
// Route modules run completely unmodified; only `@/lib/db` (real test DB
// injected) and `@/lib/session` (fake-but-realistic auth) are mocked —
// see tests/integration/setup/db.ts and setup/auth.ts for why.

import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { testDb, trackCleanup, cleanupCreatedRows, disconnectTestDb } from "./setup/db";
import { createTestUser, createTestPurok, createTestHousehold, createTestResident } from "./setup/factories";
import { authedAs, FORBIDDEN, UNAUTHORIZED } from "./setup/auth";

// `vi.mock` factories run before this file's own top-level imports are
// initialized, so they can't safely close over a module-level `const`
// (Vitest hoists the `vi.mock` call itself, not the bindings it
// references — that's a TDZ error waiting to happen). Two ways around
// it, both used below: `vi.hoisted()` for the fake `requirePermission`
// we need to reconfigure per-test, and a dynamic import *inside* the
// `@/lib/db` factory so it never needs an outer binding at all — Node's
// module cache means it still resolves to the exact same `testDb`
// singleton imported normally above.
vi.mock("@/lib/db", async () => {
  const { testDb } = await import("./setup/db");
  return { prisma: testDb };
});

const { requirePermission } = vi.hoisted(() => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/session", () => ({ requirePermission }));

import { GET, POST } from "@/app/api/residents/route";
import { GET as GET_ONE, PATCH, DELETE as ARCHIVE } from "@/app/api/residents/[id]/route";

function ctx(id: number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

describe("Residents API (integration)", () => {
  afterEach(async () => {
    requirePermission.mockReset();
    await cleanupCreatedRows();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it("creates a resident, persists it in Postgres, and writes a real audit log row", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    requirePermission.mockResolvedValue(authedAs(admin, "ADMIN"));

    const req = new NextRequest("http://localhost/api/residents", {
      method: "POST",
      body: JSON.stringify({
        fname: "Maria",
        lname: `Santos_${Date.now()}`,
        birthdate: "1995-05-05",
        sex: "FEMALE",
        civil_status: "SINGLE",
      }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(201);
    trackCleanup(() => testDb.resident.delete({ where: { id: body.id } }).then(() => {}));

    // Assert directly against the database, independent of the route's
    // own response shape — this is the point of an integration test.
    const inDb = await testDb.resident.findUnique({ where: { id: body.id } });
    expect(inDb).not.toBeNull();
    expect(inDb!.fname).toBe("Maria");
    expect(inDb!.citizenship).toBe("Filipino"); // schema default applied

    const auditRow = await testDb.auditLog.findFirst({
      where: { table_affected: "Resident", record_id: body.id, action: "CREATE" },
    });
    expect(auditRow).not.toBeNull();
    expect(auditRow!.user_id).toBe(admin.id);
  });

  it("rejects creating a duplicate resident (same name + birthdate) with 409", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    requirePermission.mockResolvedValue(authedAs(admin, "ADMIN"));

    const lname = `Reyes_${Date.now()}`;
    const existing = await createTestResident({ fname: "Pedro", lname, birthdate: new Date("1988-02-02") });

    const req = new NextRequest("http://localhost/api/residents", {
      method: "POST",
      body: JSON.stringify({
        fname: "Pedro",
        lname,
        birthdate: "1988-02-02",
        sex: "MALE",
        civil_status: "SINGLE",
      }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(409);
    expect(body.error).toBe("DUPLICATE");
    expect(body.existing.id).toBe(existing.id);

    // Confirm the route genuinely did not insert a second row.
    const count = await testDb.resident.count({ where: { fname: "Pedro", lname } });
    expect(count).toBe(1);
  });

  it("filters by search term against real rows in the database", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    requirePermission.mockResolvedValue(authedAs(admin, "ADMIN"));

    const uniqueLastName = `Bautista${Date.now()}`;
    await createTestResident({ fname: "Ana", lname: uniqueLastName });
    await createTestResident({ fname: "Ben", lname: `NotMatching_${Date.now()}` });

    const req = new NextRequest(`http://localhost/api/residents?search=${uniqueLastName}`);
    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.total).toBe(1);
    expect(body.residents[0].lname).toBe(uniqueLastName);
  });

  it("returns 403 when the caller's role lacks residents:read", async () => {
    requirePermission.mockResolvedValue(FORBIDDEN);

    const req = new NextRequest("http://localhost/api/residents");
    const res = await GET(req);
    expect(res.status).toBe(403);
  });

  it("returns 401 when there is no session at all", async () => {
    requirePermission.mockResolvedValue(UNAUTHORIZED);

    const req = new NextRequest("http://localhost/api/residents");
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it("supports the full update -> archive -> activity-history lifecycle against real data", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    requirePermission.mockResolvedValue(authedAs(admin, "ADMIN"));

    const purok = await createTestPurok();
    const resident = await createTestResident({ purok_id: purok.id });

    // PATCH: update occupation
    const patchReq = new NextRequest(`http://localhost/api/residents/${resident.id}`, {
      method: "PATCH",
      body: JSON.stringify({ occupation: "Fisherman" }),
    });
    const patchRes = await PATCH(patchReq, ctx(resident.id));
    expect(patchRes.status).toBe(200);

    const afterPatch = await testDb.resident.findUnique({ where: { id: resident.id } });
    expect(afterPatch!.occupation).toBe("Fisherman");

    // DELETE (soft archive)
    const deleteReq = new NextRequest(`http://localhost/api/residents/${resident.id}`, { method: "DELETE" });
    const deleteRes = await ARCHIVE(deleteReq, ctx(resident.id));
    expect(deleteRes.status).toBe(200);

    const afterArchive = await testDb.resident.findUnique({ where: { id: resident.id } });
    expect(afterArchive!.is_archived).toBe(true);

    // GET one: activity_history should include both real audit rows,
    // pulled live from the AuditLog table (not a mock).
    const getReq = new NextRequest(`http://localhost/api/residents/${resident.id}`);
    const getRes = await GET_ONE(getReq, ctx(resident.id));
    const full = await getRes.json();

    const actions = full.activity_history.map((a: { action: string }) => a.action);
    expect(actions).toContain("UPDATE");
    expect(actions).toContain("ARCHIVE");
  });

  it("assigns a resident to a household and reflects the relation both ways", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    requirePermission.mockResolvedValue(authedAs(admin, "ADMIN"));

    const household = await createTestHousehold();
    const resident = await createTestResident({ household_id: household.id });

    const getReq = new NextRequest(`http://localhost/api/residents/${resident.id}`);
    const getRes = await GET_ONE(getReq, ctx(resident.id));
    const full = await getRes.json();

    expect(full.household.id).toBe(household.id);

    const householdRow = await testDb.household.findUnique({
      where: { id: household.id },
      include: { members: true },
    });
    expect(householdRow!.members.map((m: { id: number }) => m.id)).toContain(resident.id);
  });
});