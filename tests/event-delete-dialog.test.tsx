import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { Id } from "../convex/_generated/dataModel";
import { DeleteEventDialog } from "../components/admin/events/delete-dialog";
import type { EventRecord } from "../components/admin/events/shared";

const editionId = "edition" as Id<"editions">;
const event: EventRecord = {
  _id: "event" as Id<"events">, _creationTime: 1, editionId, categoryId: "category" as Id<"categories">, title: "Existing event", slug: "existing-event",
  startsAt: 1800000000000, status: "upcoming", resultStatus: "none", isFeatured: false, createdBy: "organizer", createdAt: 1, updatedAt: 1,
  hasPublicationHistory: false, hasDraftResults: false, publicationState: "unpublished", categoryName: "Category B",
};
const noop = () => {};
const render = (item = event, busy = false, error = "") => renderToStaticMarkup(<DeleteEventDialog event={item} busy={busy} error={error} onCancel={noop} onConfirm={noop} />);

describe("delete event dialog", () => {
  it("shows the event name, permanence warning, and both actions", () => {
    const html = render();
    expect(html).toContain("Delete <strong>Existing event</strong>?");
    expect(html).toContain("permanently deletes the event and its draft results");
    expect(html).toContain("Audit history is retained");
    expect(html).toContain(">Cancel</button>");
    expect(html).toContain(">Delete Event</button>");
  });

  it("disables deletion when publication history exists", () => {
    const html = render({ ...event, hasPublicationHistory: true, publicationState: "published" });
    expect(html).toContain("cannot be deleted");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Delete Event<\/button>/);
  });

  it("shows progress and disables actions while deleting", () => {
    const html = render(event, true);
    expect(html).toContain("Deleting…");
    expect(html).not.toContain(">Delete Event</button>");
    expect(html.match(/disabled=""/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("shows the backend error", () => {
    expect(render(event, false, "This event changed in another session.")).toContain("This event changed in another session.");
  });
});
