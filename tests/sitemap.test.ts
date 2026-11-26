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
      SITE, `${SITE}/schedule`, `${SITE}/results`, `${SITE}/scoreboard`, `${SITE}/snapshots`, `${SITE}/about`,
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
