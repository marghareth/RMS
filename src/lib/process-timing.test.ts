// FILE: src/lib/process-timing.test.ts
import { describe, expect, it } from "vitest";
import { durationStats, formatDuration, formOpenedAt, MAX_FORM_SECONDS, minutes, span } from "@/lib/process-timing";

const now = new Date("2026-11-05T01:00:00Z");

describe("formOpenedAt", () => {
  it("works back from the save time using the elapsed seconds", () => {
    expect(formOpenedAt({ form_seconds: 95.5 }, now)?.toISOString()).toBe("2026-11-05T00:58:24.500Z");
    expect(formOpenedAt({ form_seconds: "60" }, now)?.toISOString()).toBe("2026-11-05T00:59:00.000Z");
  });
  it("ignores missing, negative, junk and over-long form times", () => {
    expect(formOpenedAt({}, now)).toBeNull();
    expect(formOpenedAt(null, now)).toBeNull();
    expect(formOpenedAt({ form_seconds: -1 }, now)).toBeNull();
    expect(formOpenedAt({ form_seconds: "abc" }, now)).toBeNull();
    expect(formOpenedAt({ form_seconds: MAX_FORM_SECONDS + 1 }, now)).toBeNull();
  });
});

describe("durations", () => {
  it("measures spans and refuses negative ones", () => {
    expect(span("2026-11-05T01:00:00Z", "2026-11-05T01:02:30Z")).toBe(150000);
    expect(span("2026-11-05T01:02:30Z", "2026-11-05T01:00:00Z")).toBeNull();
    expect(span(null, now)).toBeNull();
  });
  it("formats for people and for spreadsheets", () => {
    expect(formatDuration(45000)).toBe("45s");
    expect(formatDuration(200000)).toBe("3m 20s");
    expect(formatDuration(2 * 3600000 + 5 * 60000)).toBe("2h 05m");
    expect(formatDuration(28 * 3600000)).toBe("1d 4h");
    expect(formatDuration(null)).toBe("—");
    expect(minutes(150000)).toBe(2.5);
  });
  it("summarises average, median and range, skipping unknowns", () => {
    expect(durationStats([60000, null, 180000, 120000])).toEqual({ count: 3, average: 120000, median: 120000, fastest: 60000, slowest: 180000 });
    expect(durationStats([null]).average).toBeNull();
  });
});