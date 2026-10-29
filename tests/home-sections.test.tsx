// @vitest-environment node
vi.mock("next/font/google", () => ({ Cormorant_Garamond: () => ({ variable: "hero-test-font" }) }));
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
const data = vi.hoisted(() => ({ queries: {} as Record<string, unknown> }));
vi.mock("convex/react", () => ({ useQuery: (name: string) => data.queries[name] }));
vi.mock("../components/data", () => ({ ref: (name: string) => name, Load: ({ children }: { children: (edition: { _id: string }) => ReactNode }) => children({ _id: "test" }) }));
import { HomeContent } from "../components/home";
function setup() {
  data.queries = { "siteSettings:getPublic": null, "scoreboard:getOverall": [], "events:listPublic": [], "categories:listCurrent": [], "announcements:listPublic": [], "gallery:listApproved": [], "results:listRecentPublished": [] };
}
const event = (id: string, status: string, published = false) => ({ _id: id, slug: id, title: id, status, hasPublishedResults: published, startsAt: 0, categoryId: "category", venue: "Test venue" });
describe("homepage stacked sections", () => {
  it("renders separate sections with honest empty states and working destinations", () => {
    setup(); const html = renderToStaticMarkup(<HomeContent />);
    expect(html).not.toContain('class="home-features"');
    for (const title of ["Real-Time Updates", "Who&#x27;s Leading?", "Snapshots"]) expect(html).toContain(title);
    for (const route of ["/schedule", "/scoreboard", "/snapshots"]) expect(html).toContain(`href="${route}"`);
    expect(html).toContain("No event updates yet"); expect(html).toContain("Memories in the making");
    expect(html).not.toContain('class="points"');
  });
  it("uses official publication flags, caps cards and retains tied third ranks", () => {
    setup(); data.queries["events:listPublic"] = [event("draft", "completed"), event("published", "completed", true), event("next", "upcoming"), event("live", "live"), event("later", "upcoming")];
    data.queries["scoreboard:getOverall"] = [{ id: "a", name: "A", rank: 1, points: 30 }, { id: "b", name: "B", rank: 2, points: 20 }, { id: "c", name: "C", rank: 3, points: 10 }, { id: "d", name: "D", rank: 3, points: 10 }];
    const html = renderToStaticMarkup(<HomeContent />);
    const updates = html.split('class="home-update-grid"')[1].split('class="home-section-action"')[0];
    expect(updates.match(/home-update-card/g)).toHaveLength(3);
    expect(updates).not.toContain('href="/events/draft"'); expect(updates).not.toContain("Results Published");
    expect(html.match(/>03</g)).toHaveLength(2); expect(html.match(/tie-label/g)).toHaveLength(2);
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
});
