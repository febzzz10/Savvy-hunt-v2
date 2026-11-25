import { describe, expect, it } from "vitest";
import { sameEntries } from "../convex/lib/scoring";

describe("published result comparison", () => {
  it("treats results as unchanged only when points, placement and participant fields match", () => {
    const original = [{ schoolId: "a", points: 5, placement: 1, displayParticipantName: "Asha" }];
    expect(sameEntries(original, [{ ...original[0] }])).toBe(true);
    expect(sameEntries(original, [{ ...original[0], points: 6 }])).toBe(false);
    expect(sameEntries(original, [{ ...original[0], placement: 2 }])).toBe(false);
  });

  it("detects participant-name-only changes", () => {
    const original = [{ schoolId: "a", points: 5, displayParticipantName: "Asha" }];
    expect(sameEntries(original, [{ ...original[0], displayParticipantName: "Asha B" }])).toBe(false);
  });

  it("trims names", () => {
    expect(sameEntries(
      [{ schoolId: "a", points: 5, displayParticipantName: "  Asha  " }],
      [{ schoolId: "a", points: 5, displayParticipantName: "Asha" }],
    )).toBe(true);
  });

  it("ignores row order but not duplicate entries", () => {
    const left = [{ schoolId: "a", points: 5 }, { schoolId: "b", points: 3 }];
    expect(sameEntries(left, [{ schoolId: "b", points: 3 }, { schoolId: "a", points: 5 }])).toBe(true);
    expect(sameEntries(left, [{ schoolId: "a", points: 5 }, { schoolId: "a", points: 5 }])).toBe(false);
  });
});
