// FILE: tests/integration/rbac.integration.test.ts
//
// Unlike the other integration files, this one does NOT fake the result
// of `requirePermission` per test — it uses the real `hasPermission()`
// permission matrix (src/lib/permission.ts, completely unmocked) wired
// through a `requirePermission` stand-in that honors the exact same
// contract the real one does: `{ error, status }` on failure,
// `{ session }` on success. What IS stubbed out is only the *session
// lookup* itself (NextAuth's cookie/JWT decoding) — that's third-party
// plumbing with its own contract, orthogonal to whether this app's own
// authorization rules are correct. Swapping in a role here is exactly
// equivalent, from every route handler's point of view, to that role
// having actually signed in.
//
// This means a 403 in these tests reflects a real gap or a real, correct
// boundary in PERMISSIONS (src/lib/permission.ts) — not a test double
// that happened to return 403.

import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import type { Role } from "@prisma/client";
import { hasPermission } from "@/lib/permission";
import { testDb, cleanupCreatedRows, disconnectTestDb } from "./setup/db";
import { createTestUser } from "./setup/factories";

vi.mock("@/lib/db", async () => {
  const { testDb } = await import("./setup/db");
  return { prisma: testDb };
});

let currentUser: { id: number; role: Role } | null = null;

vi.mock("@/lib/session", () => ({
  requirePermission: async (permission: string) => {
    if (!currentUser) return { error: "Unauthorized", status: 401 };
    if (!hasPermission(currentUser.role, permission)) return { error: "Forbidden", status: 403 };
    return {
      session: {
        user: { id: String(currentUser.id), username: `user-${currentUser.id}`, role: currentUser.role },
      },
    };
  },
}));

import { POST as CREATE_BLOTTER, GET as LIST_BLOTTER } from "@/app/api/blotter/route";
import { POST as CREATE_RESIDENT } from "@/app/api/residents/route";

function signInAs(user: { id: number }, role: Role) {
  currentUser = { id: user.id, role };
}

describe("Role-based access control (integration, real permission matrix)", () => {
  afterEach(async () => {
    currentUser = null;
    await cleanupCreatedRows();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it("returns 401 with no session at all, before any permission check runs", async () => {
    const res = await LIST_BLOTTER(new NextRequest("http://localhost/api/blotter"));
    expect(res.status).toBe(401);
  });

  it("BHW cannot list blotter cases — the role has no blotter permission at all", async () => {
    const bhw = await createTestUser({ role: "BHW" });
    signInAs(bhw, "BHW");

    const res = await LIST_BLOTTER(new NextRequest("http://localhost/api/blotter"));
    expect(res.status).toBe(403);
  });

  it("ENCODER can read the blotter but cannot file a new case (read-only for that role)", async () => {
    const encoder = await createTestUser({ role: "ENCODER" });
    signInAs(encoder, "ENCODER");

    const readRes = await LIST_BLOTTER(new NextRequest("http://localhost/api/blotter"));
    expect(readRes.status).toBe(200);

    const writeReq = new NextRequest("http://localhost/api/blotter", {
      method: "POST",
      body: JSON.stringify({
        complainant_name: "Test Complainant",
        respondent_name: "Test Respondent",
        incident_narrative: "Noise complaint",
        incident_date: new Date().toISOString(),
        incident_type: "Disturbance",
      }),
    });
    const writeRes = await CREATE_BLOTTER(writeReq);
    expect(writeRes.status).toBe(403);

    // Confirm the 403 really did stop the write — no row was created.
    const count = await testDb.blotterCase.count({ where: { complainant_name: "Test Complainant" } });
    expect(count).toBe(0);
  });

  it("KAGAWAD can file a blotter case and it's genuinely persisted", async () => {
    const kagawad = await createTestUser({ role: "KAGAWAD" });
    signInAs(kagawad, "KAGAWAD");

    const complainantName = `Test Complainant ${Date.now()}`;
    const req = new NextRequest("http://localhost/api/blotter", {
      method: "POST",
      body: JSON.stringify({
        complainant_name: complainantName,
        respondent_name: "Test Respondent",
        incident_narrative: "Property dispute",
        incident_date: new Date().toISOString(),
        incident_type: "Property",
      }),
    });
    const res = await CREATE_BLOTTER(req);
    const body = await res.json();
    expect(res.status).toBe(201);

    const inDb = await testDb.blotterCase.findUnique({ where: { id: body.id } });
    expect(inDb).not.toBeNull();
    await testDb.blotterCase.delete({ where: { id: body.id } });
  });

  it("BHW cannot create residents (read-only for that role)", async () => {
    const bhw = await createTestUser({ role: "BHW" });
    signInAs(bhw, "BHW");

    const req = new NextRequest("http://localhost/api/residents", {
      method: "POST",
      body: JSON.stringify({
        fname: "Should",
        lname: "NotBeCreated",
        birthdate: "1990-01-01",
        sex: "MALE",
        civil_status: "SINGLE",
      }),
    });
    const res = await CREATE_RESIDENT(req);
    expect(res.status).toBe(403);

    const count = await testDb.resident.count({ where: { fname: "Should", lname: "NotBeCreated" } });
    expect(count).toBe(0);
  });

  it("ADMIN's wildcard permission passes hasPermission for any resource:action, real routes included", async () => {
    const admin = await createTestUser({ role: "ADMIN" });
    signInAs(admin, "ADMIN");

    // Not just asserting hasPermission() in isolation (that's already
    // covered by src/lib/permission.test.ts) — proving the wildcard
    // actually clears a real, wired-up route.
    expect(hasPermission("ADMIN", "some-future-module:delete")).toBe(true);

    const res = await LIST_BLOTTER(new NextRequest("http://localhost/api/blotter"));
    expect(res.status).toBe(200);
  });
});