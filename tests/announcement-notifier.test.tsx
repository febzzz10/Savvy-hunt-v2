// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
const toaster = vi.hoisted(() => ({ props: [] as unknown[] }));
vi.mock("dynaura", () => ({ Toaster: (props: unknown) => { toaster.props.push(props); return <div data-testid="toaster" />; }, dynaura: { info: vi.fn(), dismiss: vi.fn(), clear: vi.fn() } }));
vi.mock("dynaura/styles-no-font.css", () => ({}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("convex/react", () => ({ useQuery: () => undefined }));
vi.mock("../components/data", () => ({ ref: (n: string) => n, useCurrent: () => undefined }));
import { AnnouncementNotifier } from "../components/announcement-notifier";
describe("AnnouncementNotifier", () => {
  it("renders exactly one Toaster with queue, id dedupe and edge swipe, and is SSR safe", () => {
    toaster.props = []; const html = renderToStaticMarkup(<AnnouncementNotifier />);
    expect(html.match(/data-testid="toaster"/g)).toHaveLength(1);
    expect(toaster.props[0]).toMatchObject({ position: "top-right", queue: true, dedupe: "id", swipe: "edge" });
  });
  it("is mounted once, in the root providers", async () => {
    const { readFileSync } = await import("node:fs");
    const count = (f: string) => (readFileSync(f, "utf8").match(/<AnnouncementNotifier/g) ?? []).length;
    expect(count("app/providers.tsx")).toBe(1); expect(count("app/layout.tsx")).toBe(0);
  });
});
