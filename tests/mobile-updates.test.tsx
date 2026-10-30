// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MobileUpdates } from "../components/home/mobile-updates";
const next = { _id: "next", title: "Test upcoming event", slug: "test-next", status: "upcoming", categoryId: "category", startsAt: 0, hasPublishedResults: false };
describe("mobile homepage updates", () => {
  it("distinguishes loading from confirmed empty data without a live badge or published claim", () => {
    const loading = renderToStaticMarkup(<MobileUpdates />);
    expect(loading).toContain("Checking live events");
    const empty = renderToStaticMarkup(<MobileUpdates events={[]} results={[]} categories={[]} />);
    expect(empty).toContain("No event is live right now");
    expect(empty).toContain("Schedule to be announced");
    expect(empty).toContain("Official results pending");
    expect(empty).not.toContain('class="mobile-live-badge"');
    expect(empty).not.toContain("Results Published");
  });
  it("renders subscribed event details, category and correct destinations", () => {
    const html = renderToStaticMarkup(<MobileUpdates events={[{ ...next, _id: "live", status: "live", title: "Test live event", slug: "test-live", venue: "Test hall" }, next]} results={[{ eventTitle: "Test official event", eventSlug: "official", categoryId: "category" }]} categories={[{ _id: "category", name: "Test category" }]} />);
    for (const route of ["test-live", "test-next", "official"]) expect(html).toContain(`href="/events/${route}"`);
    expect(html).toContain("Test live event"); expect(html).toContain("Test hall"); expect(html).toContain("Test upcoming event"); expect(html).toContain("Test category"); expect(html).toContain("Results Published"); expect(html).toContain('class="mobile-live-badge"');
  });
  it("updates the presented state when subscribed records change", () => {
    expect(renderToStaticMarkup(<MobileUpdates events={[next]} results={[]} />)).toContain("Test upcoming event");
    const changed = renderToStaticMarkup(<MobileUpdates events={[{ ...next, status: "completed" }]} results={[]} />);
    expect(changed).not.toContain("Test upcoming event"); expect(changed).not.toContain("Results Published");
  });
});
