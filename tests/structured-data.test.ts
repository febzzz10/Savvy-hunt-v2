import { describe, expect, it, vi } from "vitest";
import { HOME_META, categoryMeta, clampDescription, eventMeta, faqItems, pageSchema, siteSchema } from "../lib/structured-data";
import { SITE_URL } from "../lib/site";

type Node = Record<string, unknown>;

describe("Structured data", () => {
  it("keeps the requested homepage title and description", () => {
    expect(HOME_META.title).toBe("Savvy Hunt 2026 | MGM School Programs, Events & Results");
    expect(HOME_META.description).toBe("Discover Savvy Hunt 2026 at MGM School. Explore school programs, events, announcements, student achievements, results and latest updates from MGM Savvy Hunt.");
  });

  it("describes the organization, host school and website without invented details", () => {
    const graph = siteSchema()["@graph"] as unknown as Node[];
    expect(graph.map(node => node["@type"])).toEqual(["Organization", "EducationalOrganization", "WebSite"]);
    expect(graph[1]).toMatchObject({ name: "MGM School", url: "https://mgmschool.com/", address: { addressLocality: "Kottarakara", addressCountry: "IN" } });
    // No street address, phone, geo coordinates or invented event dates anywhere in the graph.
    expect(JSON.stringify(graph)).not.toMatch(/streetAddress|telephone|"geo"|startDate|postalCode/);
  });

  it("keeps the homepage description within the 140-160 character snippet range", () => {
    expect(HOME_META.description.length).toBeGreaterThanOrEqual(140);
    expect(HOME_META.description.length).toBeLessThanOrEqual(160);
    expect(HOME_META.title.length).toBeLessThanOrEqual(60);
  });

  it("builds data-driven titles with the primary keyword up front and descriptions inside the snippet range", () => {
    const event = eventMeta("Solo Dance", "Main Auditorium");
    expect(event.title).toBe("Solo Dance Results – MGM Savvy Hunt 2026");
    const category = categoryMeta("Category I");
    expect(category.title).toBe("Category I Points – Savvy Hunt 2026 Live Scoreboard");
    for (const meta of [event, category, eventMeta("Quiz")]) {
      expect(meta.description.length).toBeGreaterThanOrEqual(110);
      expect(meta.description.length).toBeLessThanOrEqual(160);
    }
    expect(eventMeta("Quiz", "Hall 1").description).toContain("At Hall 1.");
    expect(eventMeta("Solo Dance", "Main Auditorium").description.length).toBeLessThanOrEqual(160);
    expect(eventMeta("Solo Dance", "A".repeat(200)).description).not.toContain("AAAA");
    expect(clampDescription("word ".repeat(80)).length).toBeLessThanOrEqual(160);
  });

  it("answers the three FAQ questions without inventing a date, and mirrors them in FAQPage markup", () => {
    const items = faqItems();
    expect(items.map(item => item.question)).toEqual(["How do I check Savvy Hunt 2026 results?", "Where is the live scoreboard?", "When is MGM Savvy Hunt 2026?"]);
    expect(items[2].answer).not.toMatch(/\d{1,2}(st|nd|rd|th)?\s+(January|February|March|April|May|June|July|August|September|October|November|December)/);
    const graph = pageSchema({ path: "/results", name: "Results", description: "Results", faq: items })["@graph"] as unknown as Node[];
    expect(graph.map(node => node["@type"])).toEqual(["WebPage", "FAQPage"]);
    const entities = graph[1].mainEntity as Array<{ name: string; acceptedAnswer: { text: string } }>;
    expect(entities.map(entity => [entity.name, entity.acceptedAnswer.text])).toEqual(items.map(item => [item.question, item.answer]));
  });

  it("emits no Event node until a start date is confirmed in lib/site.ts", () => {
    expect((siteSchema()["@graph"] as unknown as Node[]).some(node => node["@type"] === "Event")).toBe(false);
  });

  it("emits a complete Event node once a start date is set", async () => {
    vi.resetModules();
    vi.doMock("../lib/site", async () => ({ ...(await vi.importActual<object>("../lib/site")), EVENT_START_DATE: "2026-12-12", EVENT_END_DATE: undefined }));
    const { siteSchema: dated } = await import("../lib/structured-data");
    const event = (dated()["@graph"] as unknown as Node[]).find(node => node["@type"] === "Event");
    expect(event).toMatchObject({ name: "Savvy Hunt 2026", startDate: "2026-12-12", eventStatus: "https://schema.org/EventScheduled", eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode", organizer: { "@id": `${SITE_URL}/#school` } });
    expect(event).not.toHaveProperty("endDate");
    vi.doUnmock("../lib/site");
    vi.resetModules();
  });

  it("emits an absolute WebPage and a breadcrumb trail per route", () => {
    const graph = pageSchema({
      path: "/scoreboard/category-i",
      name: "Category I Scoreboard",
      description: "Standings",
      crumbs: [{ name: "Home", path: "/" }, { name: "Scoreboard", path: "/scoreboard" }, { name: "Category I", path: "/scoreboard/category-i" }],
    })["@graph"] as unknown as Node[];
    expect(graph[0]).toMatchObject({ "@type": "WebPage", url: `${SITE_URL}/scoreboard/category-i`, name: "Category I Scoreboard" });
    expect(graph[1]["@type"]).toBe("BreadcrumbList");
    const items = graph[1].itemListElement as Array<{ position: number; item: string }>;
    expect(items.map(item => item.position)).toEqual([1, 2, 3]);
    expect(items.map(item => item.item)).toEqual([`${SITE_URL}/`, `${SITE_URL}/scoreboard`, `${SITE_URL}/scoreboard/category-i`]);
  });

  it("omits the breadcrumb trail for the homepage", () => {
    expect(pageSchema({ path: "/", name: "Home", description: "Home" })["@graph"]).toHaveLength(1);
  });
});
