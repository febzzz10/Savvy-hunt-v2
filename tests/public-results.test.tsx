import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ queries: {} as Record<string, unknown> }));

vi.mock("convex/react", () => ({ useQuery: (name: string) => state.queries[name] }));
vi.mock("../components/data", () => ({
  ref: (name: string) => name,
  Load: ({ children }: { children: (edition: { _id: string }) => unknown }) => children({ _id: "edition" }),
}));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

import { Results } from "../app/results/page";
import { EventDetail } from "../components/public";

beforeEach(() => {
  state.queries = {};
});

describe("public result surfaces", () => {
  it("renders the results index without legacy entry labels", () => {
    state.queries["results:listRecentPublished"] = [{
      eventId: "event",
      eventTitle: "Official event",
      eventSlug: "event",
      categoryId: "category",
      publishedAt: 1800000000000,
      entries: [{ schoolId: "school", schoolName: "School A", points: 10, placement: 1, entryLabel: "Legacy Team" }],
    }];
    state.queries["categories:listCurrent"] = [{ _id: "category", name: "Category" }];
    state.queries["schools:listActive"] = [{ _id: "school", name: "School A" }];

    const html = renderToStaticMarkup(<Results editionId="edition" />);

    expect(html).toContain("School A");
    expect(html).toContain('<th scope="col">School</th>');
    expect(html).not.toContain("Legacy Team");
    expect(html).not.toContain("School / entry");
  });

  it("renders event results without legacy entry labels", () => {
    state.queries["events:getPublicBySlug"] = {
      _id: "event",
      title: "Official event",
      slug: "event",
      status: "completed",
      startsAt: 1800000000000,
      categoryId: "category",
      hasPublishedResults: true,
    };
    state.queries["results:getPublishedByEvent"] = [
      { schoolId: "school", schoolName: "School A", points: 10, placement: 1, entryLabel: "Legacy Team" },
    ];

    const html = renderToStaticMarkup(<EventDetail slug="event" />);

    expect(html).toContain("School A");
    expect(html).toContain('<th scope="col">School</th>');
    expect(html).not.toContain("Legacy Team");
    expect(html).not.toContain('<th scope="col">Entry</th>');
  });
});
