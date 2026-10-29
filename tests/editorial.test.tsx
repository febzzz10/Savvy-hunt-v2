import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Rankings, Programme, Podium } from "../components/editorial";

describe("editorial data presentation", () => {
  it("does not crown schools without positive official points", () => {
    expect(renderToStaticMarkup(<Podium rows={[{ id: "a", name: "Test school", points: 0, rank: 1 }]} />)).toBe("");
  });
  it("preserves all schools tied in first place, including ties beyond three entries", () => {
    const html = renderToStaticMarkup(<Podium rows={["a", "b", "c", "d"].map(id => ({ id, name: `Test ${id}`, points: 10, rank: 1 }))} />);
    expect(html.match(/Tied at rank/g)).toHaveLength(4);
    expect(html.match(/data-rank="1"/g)).toHaveLength(4);
    expect(html).not.toContain('data-rank="2"');
  });
  it("includes every school tied at the third rank without renumbering", () => {
    const html = renderToStaticMarkup(<Rankings preview rows={[
      { id: "a", name: "Test A", points: 20, rank: 1 },
      { id: "b", name: "Test B", points: 15, rank: 2 },
      { id: "c", name: "Test C", points: 10, rank: 3 },
      { id: "d", name: "Test D", points: 10, rank: 3 },
      { id: "e", name: "Test E", points: 5, rank: 5 },
    ]} />);
    expect(html).toContain("Test D");
    expect(html).not.toContain("Test E");
    expect(html.match(/tie-label/g)).toHaveLength(2);
    expect(html.match(/>03</g)).toHaveLength(2);
  });
  it("does not treat a completed event as a published result", () => {
    const html = renderToStaticMarkup(<Programme events={[{
      _id: "test", title: "Test event", slug: "test", startsAt: 0,
      categoryId: "category", status: "completed", hasPublishedResults: false,
    }]} />);
    expect(html).toContain("Results pending");
    expect(html).toContain("Venue to be announced");
    expect(html).not.toContain("Official results published");
  });
});
