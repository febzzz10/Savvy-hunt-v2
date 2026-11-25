import { describe, expect, it } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import { filterSchools, validateSchool, schoolError, type School } from "../lib/school-manager";
const schools: School[] = [
  { _id: "one" as Id<"schools">, _creationTime: 1, editionId: "edition" as Id<"editions">, name: "Alpha", createdAt: 1, updatedAt: 1 },
  { _id: "two" as Id<"schools">, _creationTime: 2, editionId: "edition" as Id<"editions">, name: "Beta", createdAt: 2, updatedAt: 2 },
];
describe("school manager", () => {
  it("requires a nonblank name and enforces field limits", () => {
    expect(validateSchool({ name: "  " }, schools).name).toBeTruthy();
    expect(validateSchool({ name: "X".repeat(121) }, schools)).toEqual({ name: expect.any(String) });
  });
  it("prevents duplicate names", () => {
    expect(validateSchool({ name: " beta " }, schools)).toEqual({ name: expect.any(String) });
    expect(validateSchool({ name: "Alpha" }, schools, "one")).toEqual({});
  });
  it("combines search and sort without mutating subscribed data", () => {
    expect(filterSchools(schools, " be ", "az").map(s => s.name)).toEqual(["Beta"]);
    expect(filterSchools(schools, "BE", "az").map(s => s.name)).toEqual(["Beta"]);
    expect(filterSchools(schools, "", "updated").map(s => s.name)).toEqual(["Beta", "Alpha"]);
    expect(filterSchools(schools, "", "za").map(s => s.name)).toEqual(["Beta", "Alpha"]);
    expect(filterSchools(schools, "", "points", new Map([["two", 5], ["one", 9]])).map(s => s.name)).toEqual(["Alpha", "Beta"]);
    expect(filterSchools(schools, "", "points", new Map()).map(s => s.name)).toEqual(["Alpha", "Beta"]);
    expect(schools[0].name).toBe("Alpha");
  });
  it("turns backend failures into actionable messages without exposing internals", () => {
    expect(schoolError(new Error("School name already exists"))).toContain("already in use");
    expect(schoolError(new Error("This school has published results or scoreboard history and cannot be deleted."))).toContain("cannot be deleted");
    expect(schoolError(new Error("This school has published results or scoreboard history and cannot be deleted."))).toContain("retained");
    expect(schoolError(new Error("STALE_SCHOOL"))).toContain("changed in another session");
    expect(schoolError(new Error("School missing"))).toContain("no longer available");
    expect(schoolError(new Error("FORBIDDEN"))).toContain("admin access");
    expect(schoolError(new Error("internal secret stack"), "delete")).not.toContain("internal secret");
    expect(schoolError(new Error("internal secret stack"), "delete")).toContain("delete this school");
  });
});
