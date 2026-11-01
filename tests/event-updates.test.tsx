// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventUpdates } from "../components/home/event-updates";
import type { ProgrammeEvent } from "../components/editorial";

const event = (id: string, startsAt: number, status = "upcoming", hasPublishedResults = false): ProgrammeEvent => ({
  _id: id, slug: id, title: id, startsAt, categoryId: "category", status, hasPublishedResults, venue: "",
});
const render = (events?: ProgrammeEvent[]) => renderToStaticMarkup(<EventUpdates events={events} categories={[{ _id: "category", name: "Category II" }]} />);

describe("homepage event schedule panel", () => {
  it("omits date boxes while retaining IST time and event details", () => {
    const html = render([event("quiz", Date.UTC(2026, 9, 27, 23))]);
    expect(html).not.toContain('class="event-date"');
    expect(html).not.toContain("<time");
    expect(html).toContain("4:30 am"); expect(html).toContain("IST");
    expect(html).toContain("Category II"); expect(html).toContain("Venue to be announced");
    expect(html).toContain('href="/events/quiz"');
    expect(html.match(/href="\/schedule"/g)).toHaveLength(2);
  });
  it("keeps live priority, sorts upcoming events by date, and caps the list without mutating the query", () => {
    const events = [event("late", 30), event("early", 10), event("published", 1, "completed", true), event("live", 40, "live"), event("draft", 0, "completed")];
    const html = render(events);
    expect(html.match(/class="event-schedule-row"/g)).toHaveLength(3);
    expect(html.indexOf('href="/events/live"')).toBeLessThan(html.indexOf('href="/events/early"'));
    expect(html.indexOf('href="/events/early"')).toBeLessThan(html.indexOf('href="/events/late"'));
    expect(html).toContain("Live Now"); expect(html).not.toContain('href="/events/draft"');
    expect(events[0].slug).toBe("late");
  });
  it("retains published status alongside live or upcoming status and responds to changed data", () => {
    const first = event("first", 0, "live", true);
    const html = render([first, event("result", 1, "completed", true)]);
    expect(html.match(/Results Published/g)).toHaveLength(2);
    expect(html).toContain("Live Now");
    const changed = render([{ ...first, status: "upcoming", hasPublishedResults: false, title: "Rescheduled event", startsAt: Date.UTC(2026, 10, 2, 8), venue: "New hall" }]);
    expect(changed).toContain("Rescheduled event"); expect(changed).toContain("New hall");
    expect(changed).toContain("1:30 pm"); expect(changed).not.toContain("Live Now");
    expect(changed).not.toContain("Results Published");
  });
  it("preserves loading and empty states with working schedule navigation", () => {
    expect(render()).toContain("Loading event updates...");
    expect(render([])).toContain("No event updates yet");
    expect(render([event("unpublished", 0, "completed")])).toContain("No event updates yet");
    expect(render([])).toContain("View Full Schedule");
  });
});
