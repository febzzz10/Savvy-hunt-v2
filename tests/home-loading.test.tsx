// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { HomeContent } from "../components/home";

describe("homepage initial render", () => {
  it("renders the masthead and usable links before live data arrives, without inventing standings", async () => {
    const client = new ConvexReactClient("https://loading-test.convex.cloud");
    const html = renderToString(<ConvexProvider client={client}><HomeContent /></ConvexProvider>);
    expect(html).toContain("<h1>Savvy Hunt</h1>");
    expect(html).toContain('href="/scoreboard"');
    expect(html).toContain('href="/schedule"');
    expect(html).toContain("Connecting to live event data");
    expect(html).not.toContain('class="points"');
    expect(html).not.toContain('class="leader"');
    await client.close();
  });
});
