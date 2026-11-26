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
  it("renders student and school names in separate columns without legacy entry labels", () => {
    state.queries["results:listRecentPublished"] = [{
      eventId: "event",
      eventTitle: "Official event",
      eventSlug: "event",
      categoryId: "category",
      publishedAt: 1800000000000,
      entries: [
        { schoolId: "school", schoolName: "School A", points: 10, placement: 1, participantName: "Asha" },
        { schoolId: "school-b", schoolName: "School B", points: 5, placement: 2 },
      ],
    }];
    state.queries["categories:listCurrent"] = [{ _id: "category", name: "Category" }];
    state.queries["schools:listPublic"] = [{ _id: "school", name: "School A" }, { _id: "school-b", name: "School B" }];

    const html = renderToStaticMarkup(<Results editionId="edition" />);

    expect(html).toContain('<th scope="col">Student name</th>');
    expect(html).toContain('<th scope="col">School name</th>');
    expect(html).toContain("Asha");
    expect(html).toContain("School A");
    expect(html).toContain("School B");
    // No fabricated name when the published entry has none.
    expect(html).toContain("—");
    expect(html).not.toContain("Legacy Team");
    expect(html).not.toContain("School / entry");
  });

  it("renders student and school names on the event results without legacy entry labels", () => {
    state.queries["events:getPublicBySlug"] = {
      _id: "event",
      title: "Official event",
      slug: "event",
      status: "completed",
      categoryId: "category",
      hasPublishedResults: true,
    };
    state.queries["results:getPublishedByEvent"] = [
      { schoolId: "school", schoolName: "School A", points: 10, placement: 1, participantName: "Asha" },
      { schoolId: "school-b", schoolName: "School B", points: 5, placement: 2 },
    ];

    const html = renderToStaticMarkup(<EventDetail slug="event" />);

    expect(html).toContain('<th scope="col">Student name</th>');
    expect(html).toContain('<th scope="col">School</th>');
    expect(html).toContain("Asha");
    expect(html).toContain("School A");
    expect(html).toContain("School B");
    // No fabricated name when the published entry has none.
    expect(html).toContain("—");
    expect(html).not.toContain("Legacy Team");
    expect(html).not.toContain('<th scope="col">Entry</th>');
  });
});
