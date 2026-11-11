import { describe, expect, it } from "vitest";
import { draftRowsFromEditor, editorRowsFromDraft, friendlyResultsError, participantNameChange, publishGate, sameResultRows, validateDraftRows, type DraftRow, type EditorRow } from "../lib/results-editor";

const row = (overrides: Partial<EditorRow> = {}): EditorRow => ({ schoolId: "school-a", points: 5, ...overrides });
const draft = (overrides: Partial<DraftRow> = {}): DraftRow => ({ key: "row-0", schoolId: "school-a", points: "5", placement: "", entryLabel: "", displayParticipantName: "", namePublishingApproved: false, ...overrides });

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

describe("results editor draft conversion", () => {
  it("round-trips rows while trimming labels and resetting unapproved names", () => {
    const converted = draftRowsFromEditor([row({ points: 0, placement: 1, entryLabel: " Solo ", displayParticipantName: "  ", namePublishingApproved: true })]);
    expect(converted[0]).toMatchObject({ points: "0", placement: "1", entryLabel: " Solo ", displayParticipantName: "  " });
    expect(editorRowsFromDraft(converted)[0]).toMatchObject({ points: 0, placement: 1, entryLabel: "Solo", displayParticipantName: undefined, namePublishingApproved: false });
  });

  it("clears public approval when the participant name changes", () => {
    const approved = draft({ displayParticipantName: "Asha", namePublishingApproved: true });
    expect(participantNameChange(approved, "Asha ").namePublishingApproved).toBe(true);
    expect(participantNameChange(approved, "Asha B").namePublishingApproved).toBe(false);
  });

  it("rejects invalid points, placements, schools, and empty approved names", () => {
    expect(validateDraftRows([draft({ points: "" })])).toMatch(/manual points/i);
    expect(validateDraftRows([draft({ points: "1.5" })])).toMatch(/manual points/i);
    expect(validateDraftRows([draft({ placement: "0" })])).toMatch(/placements/i);
    expect(validateDraftRows([draft({ schoolId: "" })])).toMatch(/eligible school/i);
    expect(validateDraftRows([draft({ namePublishingApproved: true })])).toMatch(/participant name/i);
  });

  it("keeps existing multi-entry schools editable but blocks new duplicates", () => {
    const existing = [row(), row()];
    expect(validateDraftRows([draft(), draft({ key: "row-1" })], { initialRows: existing })).toBe("");
    expect(validateDraftRows([draft(), draft({ key: "row-1" })] )).toMatch(/selected more than once/i);
  });
});

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

  it("detects participant-name and approval changes, treating undefined and false approval as equivalent", () => {
    const original = [row({ displayParticipantName: "Asha", namePublishingApproved: true })];
    expect(sameResultRows(original, [row({ displayParticipantName: "  Asha  ", namePublishingApproved: true })])).toBe(true);
    expect(sameResultRows(original, [row({ displayParticipantName: "Asha B", namePublishingApproved: true })])).toBe(false);
    expect(sameResultRows(original, [row({ displayParticipantName: "Asha", namePublishingApproved: false })])).toBe(false);
    expect(sameResultRows(
      [row({ displayParticipantName: "Asha", namePublishingApproved: undefined })],
      [row({ displayParticipantName: "Asha", namePublishingApproved: false })],
    )).toBe(true);
  });

  it("allows a saved name-only correction to pass the publish gate", () => {
    const corrected = row({ displayParticipantName: "Asha B", namePublishingApproved: true });
    expect(gate({
      isCorrection: true,
      rows: [corrected],
      savedRows: [corrected],
      officialRows: [row({ displayParticipantName: "Asha", namePublishingApproved: true })],
      reason: "Correct the participant name",
      savedReason: "Correct the participant name",
    })).toEqual({ ready: true, message: "" });
  });

  it("allows a saved approval-only correction to pass the publish gate", () => {
    const corrected = row({ displayParticipantName: "Asha", namePublishingApproved: true });
    expect(gate({
      isCorrection: true,
      rows: [corrected],
      savedRows: [corrected],
      officialRows: [row({ displayParticipantName: "Asha", namePublishingApproved: false })],
      reason: "Approve the participant name",
      savedReason: "Approve the participant name",
    })).toEqual({ ready: true, message: "" });
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
