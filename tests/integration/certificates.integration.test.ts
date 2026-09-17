// FILE: tests/integration/certificates.integration.test.ts
//
// DB-backed integration tests covering the full Document Request
// Workflow: create -> [residency + duplicate business rules] ->
// process (PENDING -> PROCESSING -> RELEASED) -> cancel -> public
// verification. See residents.integration.test.ts for the mocking
// pattern and tests/integration/setup/db.ts for the cleanup model.

import { describe, it, expect, vi, afterEach, afterAll } from "vitest";
import { NextRequest } from "next/server";
import { testDb, trackCleanup, cleanupCreatedRows, disconnectTestDb } from "./setup/db";
import { createTestUser, createTestResident, residencyEligibleDate } from "./setup/factories";
import { authedAs } from "./setup/auth";

vi.mock("@/lib/db", async () => {
  const { testDb } = await import("./setup/db");
  return { prisma: testDb };
});

const { requirePermission } = vi.hoisted(() => ({ requirePermission: vi.fn() }));
vi.mock("@/lib/session", () => ({ requirePermission }));

import { POST } from "@/app/api/certificates/route";
import { POST as PROCESS } from "@/app/api/certificates/[id]/process/route";
import { POST as CANCEL } from "@/app/api/certificates/[id]/cancel/route";
import { GET as VERIFY } from "@/app/api/verify/[code]/route";

function ctx(id: number) {
  return { params: Promise.resolve({ id: String(id) }) };
}

function ctxCode(code: string) {
  return { params: Promise.resolve({ code }) };
}

// The verify route rate-limits by IP via a module-level, process-lifetime
// store (src/lib/rate-limit.ts) — giving every call here its own
// synthetic x-forwarded-for keeps this suite's own verify calls from
// ever tripping that limiter against each other, whatever else has run
// in this process beforehand.
let ipCounter = 0;
function verifyRequest(code: string) {
  ipCounter += 1;
  return new NextRequest(`http://localhost/api/verify/${code}`, {
    headers: { "x-forwarded-for": `10.0.0.${ipCounter}` },
  });
}

describe("Certificates API (integration)", () => {
  afterEach(async () => {
    requirePermission.mockReset();
    await cleanupCreatedRows();
  });

  afterAll(async () => {
    await disconnectTestDb();
  });

  it("blocks issuance for a resident who hasn't lived in the barangay 6 months yet", async () => {
    const secretary = await createTestUser({ role: "SECRETARY" });
    requirePermission.mockResolvedValue(authedAs(secretary, "SECRETARY"));

    // Default factory created_at is "now" — genuinely too recent.
    const resident = await createTestResident();

    const req = new NextRequest("http://localhost/api/certificates", {
      method: "POST",
      body: JSON.stringify({
        resident_id: resident.id,
        certificate_type: "RESIDENCY",
        purpose: "Employment",
      }),
    });

    const res = await POST(req);
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toBe("RESIDENCY_CHECK_FAILED");

    const count = await testDb.certificate.count({ where: { resident_id: resident.id } });
    expect(count).toBe(0);
  });

  it("runs the full lifecycle for an eligible resident: create -> process -> release -> verify", async () => {
    const secretary = await createTestUser({ role: "SECRETARY" });
    requirePermission.mockResolvedValue(authedAs(secretary, "SECRETARY"));

    const resident = await createTestResident({ created_at: residencyEligibleDate() });

    // ── Create ──
    const createReq = new NextRequest("http://localhost/api/certificates", {
      method: "POST",
      body: JSON.stringify({
        resident_id: resident.id,
        certificate_type: "RESIDENCY",
        purpose: "Employment",
      }),
    });
    const createRes = await POST(createReq);
    const cert = await createRes.json();
    expect(createRes.status).toBe(201);
    trackCleanup(() => testDb.certificate.delete({ where: { id: cert.id } }).then(() => {}));

    expect(cert.certificate_no).toMatch(/^CERT-\d{4}-\d{6}/);
    expect(cert.queue_number).toMatch(/^Q-\d{4}-\d{4}/);
    expect(cert.status).toBe("PENDING");
    expect(cert.issued_at).toBeNull();

    // A freshly created request isn't publicly verifiable yet.
    const preVerify = await VERIFY(verifyRequest(cert.verification_code), ctxCode(cert.verification_code));
    expect((await preVerify.json()).valid).toBe(false);

    // ── Process: PENDING -> PROCESSING ──
    const toProcessing = await PROCESS(
      new NextRequest(`http://localhost/api/certificates/${cert.id}/process`, {
        method: "POST",
        body: JSON.stringify({ status: "PROCESSING" }),
      }),
      ctx(cert.id)
    );
    expect(toProcessing.status).toBe(200);
    expect((await toProcessing.json()).status).toBe("PROCESSING");

    // ── Process: PROCESSING -> RELEASED ──
    const toReleased = await PROCESS(
      new NextRequest(`http://localhost/api/certificates/${cert.id}/process`, {
        method: "POST",
        body: JSON.stringify({ status: "RELEASED" }),
      }),
      ctx(cert.id)
    );
    const released = await toReleased.json();
    expect(toReleased.status).toBe(200);
    expect(released.status).toBe("RELEASED");
    expect(released.issued_at).not.toBeNull();

    // ── Now publicly verifiable, using the real verification_code ──
    const postVerify = await VERIFY(verifyRequest(cert.verification_code), ctxCode(cert.verification_code));
    const verifyBody = await postVerify.json();
    expect(verifyBody.valid).toBe(true);
    expect(verifyBody.certificate_no).toBe(cert.certificate_no);
    expect(verifyBody.holder_name).toBe(`${resident.fname} ${resident.lname}`);

    // ── A RELEASED request is terminal: cannot be cancelled ──
    const cancelAttempt = await CANCEL(
      new NextRequest(`http://localhost/api/certificates/${cert.id}/cancel`, { method: "POST", body: "{}" }),
      ctx(cert.id)
    );
    expect(cancelAttempt.status).toBe(409);
    expect((await cancelAttempt.json()).error).toBe("ALREADY_RELEASED");
  });

  it("rejects an invalid status transition (PENDING straight to something not allowed twice)", async () => {
    const secretary = await createTestUser({ role: "SECRETARY" });
    requirePermission.mockResolvedValue(authedAs(secretary, "SECRETARY"));

    const resident = await createTestResident({ created_at: residencyEligibleDate() });
    const createRes = await POST(
      new NextRequest("http://localhost/api/certificates", {
        method: "POST",
        body: JSON.stringify({ resident_id: resident.id, certificate_type: "CLEARANCE", purpose: "Travel" }),
      })
    );
    const cert = await createRes.json();
    trackCleanup(() => testDb.certificate.delete({ where: { id: cert.id } }).then(() => {}));

    // Release it, then try to move an already-RELEASED (terminal) request
    // back to PROCESSING.
    await PROCESS(
      new NextRequest(`http://localhost/api/certificates/${cert.id}/process`, {
        method: "POST",
        body: JSON.stringify({ status: "RELEASED" }),
      }),
      ctx(cert.id)
    );

    const invalidTransition = await PROCESS(
      new NextRequest(`http://localhost/api/certificates/${cert.id}/process`, {
        method: "POST",
        body: JSON.stringify({ status: "PROCESSING" }),
      }),
      ctx(cert.id)
    );
    expect(invalidTransition.status).toBe(409);
    expect((await invalidTransition.json()).error).toBe("INVALID_TRANSITION");
  });

  it("blocks a second same-type certificate for the same resident within 30 days", async () => {
    const secretary = await createTestUser({ role: "SECRETARY" });
    requirePermission.mockResolvedValue(authedAs(secretary, "SECRETARY"));

    const resident = await createTestResident({ created_at: residencyEligibleDate() });

    const first = await POST(
      new NextRequest("http://localhost/api/certificates", {
        method: "POST",
        body: JSON.stringify({ resident_id: resident.id, certificate_type: "INDIGENCY", purpose: "Medical assistance" }),
      })
    );
    const firstCert = await first.json();
    expect(first.status).toBe(201);
    trackCleanup(() => testDb.certificate.delete({ where: { id: firstCert.id } }).then(() => {}));

    const second = await POST(
      new NextRequest("http://localhost/api/certificates", {
        method: "POST",
        body: JSON.stringify({ resident_id: resident.id, certificate_type: "INDIGENCY", purpose: "Scholarship" }),
      })
    );
    expect(second.status).toBe(409);
    expect((await second.json()).error).toBe("DUPLICATE_CERT");

    const count = await testDb.certificate.count({ where: { resident_id: resident.id, certificate_type: "INDIGENCY" } });
    expect(count).toBe(1);
  });

  it("cancels a still-pending request and it no longer appears verifiable", async () => {
    const secretary = await createTestUser({ role: "SECRETARY" });
    requirePermission.mockResolvedValue(authedAs(secretary, "SECRETARY"));

    const resident = await createTestResident({ created_at: residencyEligibleDate() });
    const createRes = await POST(
      new NextRequest("http://localhost/api/certificates", {
        method: "POST",
        body: JSON.stringify({ resident_id: resident.id, certificate_type: "GOOD_MORAL", purpose: "Application" }),
      })
    );
    const cert = await createRes.json();
    trackCleanup(() => testDb.certificate.delete({ where: { id: cert.id } }).then(() => {}));

    const cancelRes = await CANCEL(
      new NextRequest(`http://localhost/api/certificates/${cert.id}/cancel`, {
        method: "POST",
        body: JSON.stringify({ reason: "Requestor changed their mind" }),
      }),
      ctx(cert.id)
    );
    expect(cancelRes.status).toBe(200);
    expect((await cancelRes.json()).status).toBe("CANCELLED");

    const verifyRes = await VERIFY(verifyRequest(cert.verification_code), ctxCode(cert.verification_code));
    expect((await verifyRes.json()).valid).toBe(false);

    const auditActions = await testDb.auditLog.findMany({
      where: { table_affected: "Certificate", record_id: cert.id },
      orderBy: { performed_at: "asc" },
    });
    expect(auditActions.map((a: { action: string }) => a.action)).toEqual(["CREATE", "CANCEL"]);
  });
});