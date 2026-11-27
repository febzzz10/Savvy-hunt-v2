// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { query = mocks.query; } }));
import sitemap from "../app/sitemap";
import robots from "../app/robots";

const SITE = "https://savvy-hunt-v2.vercel.app";
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://test.convex.cloud"); });
afterEach(() => vi.unstubAllEnvs());

describe("Sitemap", () => {
  it("lists only the static public pages when there is no current edition", async () => {
    mocks.query.mockResolvedValueOnce(null);
    expect((await sitemap()).map(page => page.url)).toEqual([
      SITE, `${SITE}/schedule`, `${SITE}/results`, `${SITE}/scoreboard`, `${SITE}/snapshots`, `${SITE}/about`, `${SITE}/team`,
    ]);
  });
  it("adds public events and active category scoreboards without private or duplicate URLs", async () => {
    mocks.query
      .mockResolvedValueOnce({ _id: "edition" })
      .mockResolvedValueOnce([{ slug: "solo-dance" }, { slug: "quiz" }])
      .mockResolvedValueOnce([{ slug: "category-i", isActive: true }, { slug: "retired", isActive: false }, { slug: "category-i", isActive: true }]);
    const urls = (await sitemap()).map(page => page.url);
    expect(urls).toContain(`${SITE}/events/solo-dance`);
    expect(urls).toContain(`${SITE}/scoreboard/category-i`);
    expect(urls).not.toContain(`${SITE}/scoreboard/retired`);
    expect(urls.some(url => url.includes("/admin"))).toBe(false);
    expect(urls.every(url => url.startsWith(SITE))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });
  it("sets lastModified from stored event timestamps only, never from the clock", async () => {
    mocks.query
      .mockResolvedValueOnce({ _id: "edition" })
      .mockResolvedValueOnce([{ slug: "quiz", categoryId: "c1", updatedAt: Date.UTC(2026, 11, 1) }, { slug: "dance", categoryId: "c1", updatedAt: Date.UTC(2026, 11, 5) }, { slug: "legacy", categoryId: "c2" }])
      .mockResolvedValueOnce([{ _id: "c1", slug: "category-i", isActive: true }, { _id: "c2", slug: "category-ii", isActive: true }]);
    const pages = await sitemap();
    const find = (path: string) => pages.find(page => page.url === `${SITE}${path}`);
    expect(find("/events/quiz")?.lastModified).toEqual(new Date(Date.UTC(2026, 11, 1)));
    expect(find("/scoreboard/category-i")?.lastModified).toEqual(new Date(Date.UTC(2026, 11, 5)));
    expect(find("/results")?.lastModified).toEqual(new Date(Date.UTC(2026, 11, 5)));
    expect(find("/events/legacy")).not.toHaveProperty("lastModified");
    expect(find("/scoreboard/category-ii")).not.toHaveProperty("lastModified");
    expect(find("/about")).not.toHaveProperty("lastModified");
  });
  it("still serves the static pages when the backend fails", async () => {
    mocks.query.mockRejectedValue(new Error("offline"));
    expect((await sitemap()).map(page => page.url)).toContain(`${SITE}/schedule`);
  });
});

describe("Robots", () => {
  it("allows public pages, blocks the admin workspace and declares the sitemap", () => {
    expect(robots()).toEqual({ rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin/"] }, sitemap: `${SITE}/sitemap.xml` });
  });
});
