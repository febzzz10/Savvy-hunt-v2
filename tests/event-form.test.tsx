import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { EventForm } from "../components/admin/events/event-form";
import { EventPublicationStatus, type EventRecord } from "../components/admin/events/shared";

vi.mock("convex/react", () => ({ useMutation: () => vi.fn() }));

const editionId = "edition" as Id<"editions">;
const categories = ["a", "b", "c"].map((key, index): Doc<"categories"> => ({ _id: `category-${key}` as Id<"categories">, _creationTime: 1, editionId, name: `Category ${key.toUpperCase()}`, slug: key, sortOrder: index, isActive: true }));
const event: EventRecord = {
  _id: "event" as Id<"events">, _creationTime: 1, editionId, categoryId: categories[1]._id, title: "Existing event", slug: "existing-event",
  startsAt: 1800000000000, status: "upcoming", resultStatus: "none", isFeatured: false, createdBy: "organizer", createdAt: 1, updatedAt: 1,
  hasPublicationHistory: false, hasDraftResults: false, publicationState: "unpublished", categoryName: "Category B",
};
const props = { editionId, categories, schools: [], onSaved: vi.fn(), onDirtyChange: vi.fn(), onBusyChange: vi.fn() };
function render(item?: EventRecord, latest = item, options = categories) {
  const html = renderToStaticMarkup(<EventForm {...props} categories={options} event={item} latest={latest} />);
  return { html, select: html.match(/<select\b[^>]*>[\s\S]*?<\/select>/)?.[0] ?? "" };
}

describe("event category form", () => {
  it("requires an explicit category for creation without defaulting to the first category", () => {
    const { select } = render();
    expect(select).toMatch(/value="" selected=""/);
    expect(select).not.toContain("disabled");
  });

  it("initializes the exact existing category ID even when options are reordered", () => {
    const { select } = render(event, event, [...categories].reverse());
    expect(select).toMatch(/value="category-b" selected=""/);
    expect(select).not.toContain("disabled");
  });

  it.each(["published", "revoked"] as const)("locks the original category for %s events while retaining other editing controls", publicationState => {
    const item = { ...event, hasPublicationHistory: true, publicationState };
    const { select, html } = render(item);
    expect(select).toMatch(/^<select[^>]*disabled=""/);
    expect(select).toMatch(/value="category-b" selected=""/);
    expect(html).toContain("Category cannot be changed because this event has publication history.");
    expect(html).toMatch(/<input[^>]*value="Existing event"/);
    expect(html).toContain(">Save event</button>");
    expect(html).not.toMatch(/<button[^>]*disabled[^>]*>Save event/);
  });

  it("keeps the selector editable for a draft that has never been published", () => {
    const { select } = render({ ...event, publicationState: "draft", hasDraftResults: true, resultStatus: "draft" });
    expect(select).not.toContain("disabled");
    expect(select).toMatch(/value="category-b" selected=""/);
  });

  it("retains the original category as an option if the category list does not contain it", () => {
    const item = { ...event, hasPublicationHistory: true, publicationState: "revoked" as const };
    expect(render(item, item, []).select).toContain('<option value="category-b" selected="">Category B</option>');
  });

  it("blocks stale edits when the category changes, even if the update timestamp matches", () => {
    const latest = { ...event, categoryId: categories[2]._id };
    const { html, select } = render(event, latest);
    expect(select).toMatch(/value="category-b" selected=""/);
    expect(html).toContain("This event changed in another session.");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Save event/);
  });

  it("locks and blocks an open form when publication history arrives through realtime updates", () => {
    const { html, select } = render(event, { ...event, hasPublicationHistory: true, publicationState: "revoked" });
    expect(select).toMatch(/^<select[^>]*disabled=""/);
    expect(html).toContain("This event changed in another session.");
  });
});

describe("admin publication status", () => {
  it.each(["unpublished", "draft", "published", "revoked"] as const)("displays %s distinctly", publicationState => {
    const html = renderToStaticMarkup(<EventPublicationStatus event={{ publicationState, hasDraftResults: publicationState === "draft" }} />);
    expect(html).toContain(`>${publicationState[0].toUpperCase() + publicationState.slice(1)}</span>`);
    if (publicationState === "revoked") expect(html).not.toContain("Unpublished");
  });
  it("shows a private draft alongside revoked history", () => {
    const html = renderToStaticMarkup(<EventPublicationStatus event={{ publicationState: "revoked", hasDraftResults: true }} />);
    expect(html).toContain(">Revoked</span>");
    expect(html).toContain(">Private draft</span>");
    expect(html).not.toContain("Unpublished");
  });
});
