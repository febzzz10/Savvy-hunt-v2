import { describe, expect, it } from "vitest";
import { HOME_META, pageSchema, siteSchema } from "../lib/structured-data";
import { SITE_URL } from "../lib/site";

type Node = Record<string, unknown>;

describe("Structured data", () => {
  it("keeps the requested homepage title and description", () => {
    expect(HOME_META.title).toBe("Savvy Hunt 2026 | MGM School Programs, Events & Results");
    expect(HOME_META.description).toBe("Discover Savvy Hunt 2026 at MGM School. Explore school programs, events, announcements, student achievements, results and the latest updates from MGM Savvy Hunt.");
  });

  it("describes the organization, host school and website without invented details", () => {
    const graph = siteSchema()["@graph"] as unknown as Node[];
    expect(graph.map(node => node["@type"])).toEqual(["Organization", "EducationalOrganization", "WebSite"]);
    expect(graph[1]).toMatchObject({ name: "MGM School", address: { addressLocality: "Kottarakara", addressCountry: "IN" } });
    // No street address, phone, geo coordinates or invented event dates anywhere in the graph.
    expect(JSON.stringify(graph)).not.toMatch(/streetAddress|telephone|"geo"|startDate|postalCode/);
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
