import { describe, expect, it } from "vitest";
import { sameEntries } from "../convex/lib/scoring";

describe("published result comparison", () => {
  it("treats results as unchanged only when points, placement and entry label all match", () => {
    const original = [{ schoolId: "a", points: 5, placement: 1, entryLabel: "Solo" }];
    expect(sameEntries(original, [{ schoolId: "a", points: 5, placement: 1, entryLabel: "Solo" }])).toBe(true);
    expect(sameEntries(original, [{ schoolId: "a", points: 6, placement: 1, entryLabel: "Solo" }])).toBe(false);
    expect(sameEntries(original, [{ schoolId: "a", points: 5, placement: 2, entryLabel: "Solo" }])).toBe(false);
    expect(sameEntries(original, [{ schoolId: "a", points: 5, placement: 1, entryLabel: "Duet" }])).toBe(false);
  });

  it("ignores row order but not duplicate entries", () => {
    const left = [{ schoolId: "a", points: 5 }, { schoolId: "b", points: 3 }];
    expect(sameEntries(left, [{ schoolId: "b", points: 3 }, { schoolId: "a", points: 5 }])).toBe(true);
    expect(sameEntries(left, [{ schoolId: "a", points: 5 }, { schoolId: "a", points: 5 }])).toBe(false);
  });
});
