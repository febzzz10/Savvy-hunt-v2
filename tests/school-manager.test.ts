import { describe, expect, it } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import { filterSchools, validateSchool, schoolError, type School } from "../lib/school-manager";
const schools: School[] = [
  { _id: "one" as Id<"schools">, _creationTime: 1, editionId: "edition" as Id<"editions">, name: "Alpha", code: "AL", status: "active", createdAt: 1, updatedAt: 1 },
  { _id: "two" as Id<"schools">, _creationTime: 2, editionId: "edition" as Id<"editions">, name: "Beta", code: "BE", status: "archived", createdAt: 2, updatedAt: 2 },
];
describe("school manager", () => {
  it("requires a nonblank name and enforces field limits", () => {
    expect(validateSchool({ name: "  ", code: "", status: "active" }, schools).name).toBeTruthy();
    expect(validateSchool({ name: "X".repeat(121), code: "C".repeat(25), status: "active" }, schools)).toEqual({ name: expect.any(String), code: expect.any(String) });
  });
  it("prevents duplicate names and normalized codes, including inactive schools", () => {
    expect(validateSchool({ name: " beta ", code: " al ", status: "active" }, schools)).toEqual({ name: expect.any(String), code: expect.any(String) });
    expect(validateSchool({ name: "Alpha", code: "al", status: "active" }, schools, "one")).toEqual({});
  });
  it("combines search and status filters without mutating subscribed data", () => {
    expect(filterSchools(schools, " be ", "archived", "az").map(s => s.name)).toEqual(["Beta"]);
    expect(filterSchools(schools, "BE", "active", "az")).toEqual([]);
    expect(filterSchools(schools, "", "", "updated").map(s => s.name)).toEqual(["Beta", "Alpha"]);
    expect(filterSchools(schools, "", "", "za").map(s => s.name)).toEqual(["Beta", "Alpha"]);
    expect(schools[0].name).toBe("Alpha");
  });
  it("turns backend failures into actionable messages without exposing internals", () => {
    expect(schoolError(new Error("School name or code already exists"))).toContain("already in use");
    expect(schoolError(new Error("FORBIDDEN"))).toContain("admin access");
    expect(schoolError(new Error("internal secret stack"))).not.toContain("internal secret");
  });
});
