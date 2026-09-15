// FILE: src/app/api/ping/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { prisma } from "@/lib/db";

vi.mock("@/lib/db", () => ({
  prisma: { $queryRaw: vi.fn() },
}));

describe("GET /api/ping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 200 and ok status when the database responds", async () => {
    (prisma.$queryRaw as any).mockResolvedValue([{ "?column?": 1 }]);

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.db).toBe("reachable");
    expect(typeof body.timestamp).toBe("string");
  });

  it("returns 503 when the database query fails", async () => {
    (prisma.$queryRaw as any).mockRejectedValue(new Error("connection refused"));

    const res = await GET();
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body.status).toBe("error");
    expect(body.db).toBe("unreachable");
  });
});