import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("../components/connection-status", () => ({ ConnectionStatus: () => null }));
vi.mock("../components/mobile-navigation", () => ({ MobileNavigation: () => null }));

import { Nav } from "../components/public";
import { Footer } from "../components/editorial";

describe("public navigation", () => {
  it("does not expose an admin entry point in the header", () => {
    const html = renderToStaticMarkup(<Nav />);
    expect(html).not.toContain('href="/admin"');
    expect(html).not.toContain("Admin Panel");
    expect(html).not.toContain(">Admin<");
  });
  it("does not expose an admin entry point in the footer", () => {
    const html = renderToStaticMarkup(<Footer />);
    expect(html).not.toContain('href="/admin"');
    expect(html).not.toContain("Organizer access");
  });
});
