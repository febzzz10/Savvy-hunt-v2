// @vitest-environment node
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { EventUpdates } from "../components/home/event-updates";
import type { ProgrammeEvent } from "../components/editorial";

const event = (id: string, status = "upcoming", hasPublishedResults = false): ProgrammeEvent => ({
  _id: id, slug: id, title: id, categoryId: "category", status, hasPublishedResults, venue: "",
});
const render = (events?: ProgrammeEvent[]) => renderToStaticMarkup(<EventUpdates events={events} categories={[{ _id: "category", name: "Category II" }]} />);

describe("homepage event schedule panel", () => {
  it("omits dates while retaining event details", () => {
    const html = render([event("quiz")]);
    expect(html).not.toContain('class="event-date"');
    expect(html).not.toContain("<time");
    expect(html).not.toContain("IST");
    expect(html).toContain("Category II"); expect(html).toContain("Venue to be announced");
    expect(html).toContain('href="/events/quiz"');
    expect(html.match(/href="\/schedule"/g)).toHaveLength(2);
  });
  it("keeps live priority, caps the list, and does not mutate the query", () => {
    const events = [event("late"), event("early"), event("published", "completed", true), event("live", "live"), event("draft", "completed")];
    const html = render(events);
    expect(html.match(/class="event-schedule-row"/g)).toHaveLength(3);
    expect(html.indexOf('href="/events/live"')).toBeLessThan(html.indexOf('href="/events/late"'));
    expect(html.indexOf('href="/events/late"')).toBeLessThan(html.indexOf('href="/events/early"'));
    expect(html).toContain("Live Now"); expect(html).not.toContain('href="/events/draft"');
    expect(events[0].slug).toBe("late");
  });
  it("retains published status alongside live or upcoming status and responds to changed data", () => {
    const first = event("first", "live", true);
    const html = render([first, event("result", "completed", true)]);
    expect(html.match(/Results Published/g)).toHaveLength(2);
    expect(html).toContain("Live Now");
    const changed = render([{ ...first, status: "upcoming", hasPublishedResults: false, title: "Rescheduled event", venue: "New hall" }]);
    expect(changed).toContain("Rescheduled event"); expect(changed).toContain("New hall");
    expect(changed).not.toContain("Live Now");
    expect(changed).not.toContain("Results Published");
  });
  it("preserves loading and empty states with working schedule navigation", () => {
    expect(render()).toContain("Loading event updates...");
    expect(render([])).toContain("No event updates yet");
    expect(render([event("unpublished", "completed")])).toContain("No event updates yet");
    expect(render([])).toContain("View Full Schedule");
  });
});
