import { describe, expect, it } from "vitest";
import { friendlyResultsError, publishGate, sameResultRows, type EditorRow } from "../lib/results-editor";

const row = (overrides: Partial<EditorRow> = {}): EditorRow => ({ schoolId: "school-a", points: 5, ...overrides });

function gate(overrides: Partial<Parameters<typeof publishGate>[0]> = {}) {
  return publishGate({
    isCorrection: false,
    draftExists: true,
    hasPreview: true,
    rows: [row()],
    savedRows: [row()],
    officialRows: [],
    reason: "",
    savedReason: "",
    ...overrides,
  });
}

describe("results editor publish gate", () => {
  it("allows a first publication without a correction reason", () => {
    expect(gate()).toEqual({ ready: true, message: "" });
  });

  it("requires a reason before a correction can be published", () => {
    const result = gate({ isCorrection: true, officialRows: [row({ points: 1 })], reason: "   " });
    expect(result.ready).toBe(false);
    expect(result.message).toMatch(/reason for this correction/i);
  });

  it("blocks publishing when the typed correction reason is not saved", () => {
    const result = gate({
      isCorrection: true,
      officialRows: [row({ points: 1 })],
      reason: "Judge correction",
      savedReason: "",
    });
    expect(result.ready).toBe(false);
    expect(result.message).toMatch(/save the correction reason/i);
  });

  it("allows a saved correction reason with changed results", () => {
    expect(gate({
      isCorrection: true,
      rows: [row({ points: 8 })],
      savedRows: [row({ points: 8 })],
      officialRows: [row({ points: 5 })],
      reason: "Judge correction",
      savedReason: "Judge correction",
    })).toEqual({ ready: true, message: "" });
  });

  it("blocks publishing while result edits are unsaved", () => {
    const result = gate({ rows: [row({ points: 9 })], savedRows: [row({ points: 5 })] });
    expect(result.ready).toBe(false);
    expect(result.message).toMatch(/save your result changes/i);
  });

  it("detects unchanged results by points, placement and entry label", () => {
    const original = [row({ points: 5, placement: 1, entryLabel: "Solo" })];
    expect(sameResultRows(original, [row({ points: 5, placement: 1, entryLabel: "Solo" })])).toBe(true);
    expect(sameResultRows(original, [row({ points: 6, placement: 1, entryLabel: "Solo" })])).toBe(false);
    expect(sameResultRows(original, [row({ points: 5, placement: 2, entryLabel: "Solo" })])).toBe(false);
    expect(sameResultRows(original, [row({ points: 5, placement: 1, entryLabel: "Duet" })])).toBe(false);
  });

  it("blocks a correction that matches the published revision", () => {
    const result = gate({
      isCorrection: true,
      rows: [row({ points: 5 })],
      savedRows: [row({ points: 5 })],
      officialRows: [row({ points: 5 })],
      reason: "No real change",
      savedReason: "No real change",
    });
    expect(result.ready).toBe(false);
    expect(result.message).toMatch(/no changes to publish/i);
  });

  it("blocks publishing an empty draft", () => {
    const result = gate({ rows: [], savedRows: [], officialRows: [] });
    expect(result.ready).toBe(false);
    expect(result.message).toMatch(/at least one result row/i);
  });

  it("returns friendly messages instead of raw Convex errors", () => {
    expect(friendlyResultsError(new Error("[CONVEX M(results:publish)] Correction reason required")))
      .toBe("Enter a reason for this correction.");
    expect(friendlyResultsError(new Error("[CONVEX M(results:publish)] STALE_DRAFT")))
      .toMatch(/draft changed in another session/i);
    expect(friendlyResultsError(new Error("[CONVEX M(results:publish)] STALE_REVISION")))
      .toMatch(/official results changed in another session/i);
    expect(friendlyResultsError(new Error("[CONVEX M(results:publish)] Something unexpected")))
      .toBe("Something unexpected");
  });

  it("explains historical category restrictions without exposing a Convex stack", () => {
    const result = friendlyResultsError(new Error("[CONVEX M(events:save)] [Request ID: example] Server Error\nUncaught Error: Cannot change category after publication\n    at handler (convex/events.ts:17:429)"));
    expect(result).toBe("Cannot change this event's category because official results were previously published. Keep the original category or create a new event.");
    expect(result).not.toContain("convex/events.ts");
  });

  it("reads safe Convex error data and hides unrecognized server stack traces", () => {
    expect(friendlyResultsError({ data: "STALE_EVENT", message: "Server Error" })).toMatch(/event changed in another session/i);
    expect(friendlyResultsError(new Error("[CONVEX M(events:save)] Server Error\nUncaught Error: Private implementation failure\n    at handler (convex/events.ts:42)"))).toBe("Something went wrong. Please try again.");
    expect(friendlyResultsError(new Error("[CONVEX M(events:save)] Server Error\nUncaught Error: Event title already exists\n    at handler"))).toBe("Event title already exists.");
  });
});
