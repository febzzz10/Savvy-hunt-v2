// @vitest-environment node
vi.mock("next/font/google", () => ({ Cormorant_Garamond: () => ({ variable: "hero-test-font" }) }));
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
const data = vi.hoisted(() => ({ queries: {} as Record<string, unknown>, calls: [] as { name: string; args: unknown }[] }));
vi.mock("convex/react", () => ({ useQuery: (name: string, args: unknown) => { data.calls.push({ name, args }); return data.queries[name]; } }));
vi.mock("../components/data", () => ({ ref: (name: string) => name, Load: ({ children }: { children: (edition: { _id: string }) => ReactNode }) => children({ _id: "test" }) }));
import { HomeContent } from "../components/home";
function setup() {
  data.calls = [];
  data.queries = { "siteSettings:getPublic": null, "scoreboard:getOverall": [], "events:listPublic": [], "categories:listCurrent": [], "announcements:listPublic": [], "gallery:listApproved": [], "results:listRecentPublished": [] };
}
const event = (id: string, status: string, published = false) => ({ _id: id, slug: id, title: id, status, hasPublishedResults: published, startsAt: 0, categoryId: "category", venue: "Test venue" });
describe("homepage stacked sections", () => {
  it("requests three recent results and renders every returned event as a card", () => {
    setup();
    data.queries["results:listRecentPublished"] = Array.from({ length: 3 }, (_, index) => ({ eventId: `event-${index}`, eventSlug: `event-${index}`, eventTitle: `Published event ${index}`, categoryId: "arts", publishedAt: 1800000000000 - index, entries: [] }));
    const html = renderToStaticMarkup(<HomeContent />);
    expect(data.calls.find(call => call.name === "results:listRecentPublished")?.args).toEqual({ editionId: "test", limit: 3 });
    expect(html.match(/class="achievement-card"/g)).toHaveLength(3);
    expect(html.indexOf("Published event 0</h3>")).toBeLessThan(html.indexOf("Published event 2</h3>"));
  });
  it("renders separate sections with honest empty states and working destinations", () => {
    setup(); const html = renderToStaticMarkup(<HomeContent />);
    expect(html).not.toContain('class="home-features"');
    for (const title of ["What&#x27;s Next?", "Leading Schools", "Snapshots"]) expect(html).toContain(title);
    for (const route of ["/schedule", "/scoreboard", "/snapshots"]) expect(html).toContain(`href="${route}"`);
    expect(html).toContain("No event updates yet"); expect(html).toContain("Memories in the making");
    expect(html).not.toContain('class="points"');
  });
  it("uses official publication flags, caps cards and retains tied third ranks", () => {
    setup(); data.queries["events:listPublic"] = [event("draft", "completed"), event("published", "completed", true), event("next", "upcoming"), event("live", "live"), event("later", "upcoming")];
    data.queries["scoreboard:getOverall"] = [{ id: "a", name: "A", rank: 1, points: 30 }, { id: "b", name: "B", rank: 2, points: 20 }, { id: "c", name: "C", rank: 3, points: 10 }, { id: "d", name: "D", rank: 3, points: 10 }];
    const html = renderToStaticMarkup(<HomeContent />);
    const updates = html.split('class="event-schedule-list"')[1].split('</ul>')[0];
    expect(updates.match(/class="event-schedule-row"/g)).toHaveLength(3);
    expect(updates).not.toContain('href="/events/draft"'); expect(updates).not.toContain("Results Published");
    expect(html.match(/rank 3, 10 points/g)).toHaveLength(2); expect(html.match(/tie-label/g)).toHaveLength(2);
    data.queries["events:listPublic"] = [event("published", "completed", true)];
    const published = renderToStaticMarkup(<HomeContent />);
    expect(published).toContain("Results Published"); expect(published).toContain('href="/events/published"');
  });
  it("shows three proxy-backed approved query images and updates when query data changes", () => {
    setup(); data.queries["gallery:listApproved"] = [1, 2, 3, 4].map(id => ({ _id: `photo-${id}`, altText: `Approved photo ${id}` }));
    const html = renderToStaticMarkup(<HomeContent />).split('class="home-photo-grid"')[1];
    expect(html.match(/\/api\/gallery\//g)).toHaveLength(3);
    expect(html).not.toContain("photo-4");
    data.queries["gallery:listApproved"] = [];
    expect(renderToStaticMarkup(<HomeContent />)).toContain("Memories in the making");
  });
  it("keeps podium ranks and scores driven by query data and preserves loading states", () => {
    setup();
    data.queries["events:listPublic"] = [event("published", "completed", true)];
    data.queries["scoreboard:getOverall"] = [{ id: "a", name: "A long school name", rank: 1, points: 560 }, { id: "b", name: "School B", rank: 2, points: 420 }, { id: "c", name: "School C", rank: 3, points: 395 }];
    const html = renderToStaticMarkup(<HomeContent />);
    expect(html).toContain('aria-label="View Full Scoreboard"');
    expect(html.indexOf('data-rank="2"')).toBeLessThan(html.indexOf('data-rank="1"'));
    expect(html.indexOf('data-rank="1"')).toBeLessThan(html.indexOf('data-rank="3"'));
    expect(html).toContain("A long school name, rank 1, 560 points");
    data.queries["scoreboard:getOverall"] = [{ id: "b", name: "School B", rank: 1, points: 600 }, { id: "a", name: "A long school name", rank: 2, points: 560 }];
    const changed = renderToStaticMarkup(<HomeContent />);
    expect(changed).toContain("School B, rank 1, 600 points");
    expect(changed).not.toContain("School B, rank 2, 420 points");
    data.queries["scoreboard:getOverall"] = undefined;
    expect(renderToStaticMarkup(<HomeContent />)).toContain("Loading official standings...");
  });
});
