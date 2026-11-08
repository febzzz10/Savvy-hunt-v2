import { describe, expect, it } from "vitest";
import { sameEntries } from "../convex/lib/scoring";

describe("published result comparison", () => {
  it("treats results as unchanged only when points, placement, entry label and participant fields match", () => {
    const original = [{ schoolId: "a", points: 5, placement: 1, entryLabel: "Solo", displayParticipantName: "Asha", namePublishingApproved: true }];
    expect(sameEntries(original, [{ ...original[0] }])).toBe(true);
    expect(sameEntries(original, [{ ...original[0], points: 6 }])).toBe(false);
    expect(sameEntries(original, [{ ...original[0], placement: 2 }])).toBe(false);
    expect(sameEntries(original, [{ ...original[0], entryLabel: "Duet" }])).toBe(false);
  });

  it("detects participant-name-only and approval-only changes", () => {
    const original = [{ schoolId: "a", points: 5, displayParticipantName: "Asha", namePublishingApproved: true }];
    expect(sameEntries(original, [{ ...original[0], displayParticipantName: "Asha B" }])).toBe(false);
    expect(sameEntries(original, [{ ...original[0], namePublishingApproved: false }])).toBe(false);
  });

  it("treats undefined and false approval as equivalent and trims names", () => {
    expect(sameEntries(
      [{ schoolId: "a", points: 5, displayParticipantName: "  Asha  ", namePublishingApproved: undefined }],
      [{ schoolId: "a", points: 5, displayParticipantName: "Asha", namePublishingApproved: false }],
    )).toBe(true);
  });

  it("ignores row order but not duplicate entries", () => {
    const left = [{ schoolId: "a", points: 5 }, { schoolId: "b", points: 3 }];
    expect(sameEntries(left, [{ schoolId: "b", points: 3 }, { schoolId: "a", points: 5 }])).toBe(true);
    expect(sameEntries(left, [{ schoolId: "a", points: 5 }, { schoolId: "a", points: 5 }])).toBe(false);
  });
});
