export type EditorRow = { schoolId: string; points: number; placement?: number; entryLabel?: string };

const rowKey = (row: EditorRow) => `${row.schoolId}\u0000${row.points}\u0000${row.placement ?? ""}\u0000${(row.entryLabel ?? "").trim()}`;

export function sameResultRows(left: EditorRow[], right: EditorRow[]) {
  if (left.length !== right.length) return false;
  const a = left.map(rowKey).sort(), b = right.map(rowKey).sort();
  return a.every((value, index) => value === b[index]);
}

type GateInput = {
  isCorrection: boolean;
  draftExists: boolean;
  hasPreview: boolean;
  rows: EditorRow[];
  savedRows: EditorRow[];
  officialRows: EditorRow[];
  reason: string;
  savedReason: string;
};

export function publishGate({ isCorrection, draftExists, hasPreview, rows, savedRows, officialRows, reason, savedReason }: GateInput) {
  if (!draftExists) return { ready: false, message: "Save a draft before publishing." };
  if (!savedRows.length) return { ready: false, message: "Add at least one result row before publishing." };
  if (!sameResultRows(rows, savedRows)) return { ready: false, message: "Save your result changes before publishing." };
  if (isCorrection && !reason.trim()) return { ready: false, message: "Enter a reason for this correction." };
  if (isCorrection && reason.trim() !== savedReason.trim()) return { ready: false, message: "Save the correction reason before publishing." };
  if (isCorrection && sameResultRows(savedRows, officialRows)) return { ready: false, message: "These results match the published revision. There are no changes to publish." };
  if (!hasPreview) return { ready: false, message: "Checking the publication preview…" };
  return { ready: true, message: "" };
}

export function friendlyResultsError(error: unknown) {
  const raw = error && typeof error === "object" && "data" in error && typeof error.data === "string" ? error.data : error instanceof Error ? error.message : String(error ?? "");
  const message = raw.replace(/^\[CONVEX[^\]]*\]\s*/i, "").trim();
  if (/cannot change.*category.*publication|category.*previously published/i.test(message)) return "Cannot change this event's category because official results were previously published. Keep the original category or create a new event.";
  if (/STALE_EVENT/i.test(message)) return "This event changed in another session. Cancel and reopen the editor to load the latest details.";
  if (/UNAUTHENTICATED/i.test(message)) return "Please sign in again.";
  if (/FORBIDDEN/i.test(message)) return "You do not have permission to do that.";
  if (/STALE_DRAFT/i.test(message)) return "This draft changed in another session. Reload the page and try again.";
  if (/STALE_REVISION/i.test(message)) return "Official results changed in another session. Reload the page and try again.";
  if (/correction reason required/i.test(message)) return "Enter a reason for this correction.";
  if (/cannot publish empty results/i.test(message)) return "Add at least one result row before publishing.";
  if (/revision is not a draft/i.test(message)) return "This revision is no longer a draft. Reload the page.";
  const eventMessages = ["Event title already exists", "Event title is required", "Invalid category", "Invalid schedule", "Invalid participating school", "Duplicate participating school", "Cannot remove a school from published results", "Event information is too long", "Event missing"];
  const eventMessage = eventMessages.find(text => message.includes(text));
  if (eventMessage) return `${eventMessage}.`;
  if (/Server Error|Uncaught|\n\s+at\s|\[Request ID:/i.test(message)) return "Something went wrong. Please try again.";
  return message || "Something went wrong. Please try again.";
}
