import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { AchievementCard } from "../components/home/achievement-card";
import type { AchievementResult } from "../lib/achievement-results";

const result = (entries: AchievementResult["entries"], eventTitle = "Official event"): AchievementResult => ({
  eventId: "event",
  eventTitle,
  eventSlug: "event",
  categoryId: "category",
  publishedAt: 1800000000000,
  entries,
});

const count = (html: string, text: string) => html.match(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"))?.length ?? 0;

describe("official winners card", () => {
  it("renders an approved participant name as the primary bold label and the school as muted", () => {
    const html = renderToStaticMarkup(<AchievementCard result={result([{ schoolId: "school", schoolName: "School A", placement: 1, participantName: "Asha", points: 98765 }])} />);
    expect(html).toContain("<strong>Asha</strong>");
    expect(html).toContain('class="achievement-school">School A</span>');
    expect(html).not.toContain("98765");
  });

  it("falls back to the bold school name when no approved participant name exists", () => {
    const html = renderToStaticMarkup(<AchievementCard result={result([{ schoolId: "school", schoolName: "School A", placement: 1 }])} />);
    expect(html).toContain("<strong>School A</strong>");
    expect(html).not.toContain("achievement-school");
  });

  it("deduplicates participant and school text case-insensitively after trimming", () => {
    const html = renderToStaticMarkup(<AchievementCard result={result([{ schoolId: "school", schoolName: "School A", placement: 1, participantName: "  school a  " }])} />);
    expect(count(html, "school a")).toBe(1);
  });

  it("never renders legacy entry labels or points", () => {
    const html = renderToStaticMarkup(<AchievementCard result={result([{ schoolId: "school", schoolName: "School A", placement: 1, participantName: "Asha", points: 424242, entryLabel: "Legacy Team" } as AchievementResult["entries"][number]])} />);
    expect(html).not.toContain("Legacy Team");
    expect(html).not.toContain("424242");
  });
});
