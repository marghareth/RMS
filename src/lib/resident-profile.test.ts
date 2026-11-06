// FILE: src/lib/resident-profile.test.ts
import { describe, expect, it } from "vitest";
import { allowedSections, maskPhilSys, naturalName } from "@/lib/resident-profile";

describe("allowedSections", () => {
  const all = "personal,household,certificates,health,assistance,blotter";
  it("keeps the standard order and drops unknown keys", () => {
    expect(allowedSections("blotter,personal,../x", "ADMIN")).toEqual(["personal", "blotter"]);
  });
  it("leaves out sections the role can't see", () => {
    const bhw = allowedSections(all, "BHW");
    expect(bhw).toContain("health");
    expect(bhw).not.toContain("blotter");
    expect(bhw).not.toContain("certificates");
  });
  it("returns nothing when nothing was chosen", () => {
    expect(allowedSections(null, "ADMIN")).toEqual([]);
    expect(allowedSections("", "ADMIN")).toEqual([]);
  });
});

describe("helpers", () => {
  it("prints only the last four PhilSys digits", () => {
    expect(maskPhilSys("1234-5678-9012-3456")).toBe("•••• •••• 3456");
    expect(maskPhilSys(null)).toBe("");
  });
  it("writes names in natural order", () => {
    expect(naturalName({ fname: "Juan", lname: "Dela Cruz", mname: "Santos", name_extension: "Jr." })).toBe("Juan S. Dela Cruz Jr.");
  });
});