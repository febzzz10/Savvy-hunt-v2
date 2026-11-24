// @vitest-environment node
import { describe, expect, it, vi } from "vitest";
import { announcementPreview, createAnnouncementTracker, takeNewAnnouncements, type PublishedAnnouncement } from "../lib/announcement-notifications";
const item = (id: string, publishedAt = 1000, title = id): PublishedAnnouncement => ({ _id: id, title, body: `${id} body`, publishedAt });
function setup(visible = true) { const shown: string[] = []; const tracker = createAnnouncementTracker(a => shown.push(a._id)); return { shown, tracker, update: (items: PublishedAnnouncement[], v = visible) => tracker.update("ed", items, v) }; }
describe("announcement notification tracking", () => {
  it("never notifies for announcements already published when the page loads", () => {
    const t = setup(); t.update([item("a"), item("b")]); expect(t.shown).toEqual([]);
  });
  it("notifies once for a newly published announcement, with no repeat on re-delivery", () => {
    const t = setup(); t.update([item("a")]); t.update([item("b", 2000), item("a")]); t.update([item("b", 2000), item("a")]);
    expect(t.shown).toEqual(["b"]);
  });
  it("queues several simultaneous announcements oldest first", () => {
    const t = setup(); t.update([]); t.update([item("c", 3000), item("b", 2000), item("a", 1000)]);
    expect(t.shown).toEqual(["a", "b", "c"]);
  });
  it("ignores drafts and deleted announcements: they are absent from the published list", () => {
    const t = setup(); t.update([item("a")]); t.update([item("a"), item("draft-never-listed")].slice(0, 1)); t.update([]);
    expect(t.shown).toEqual([]);
  });
  it("a deleted announcement that was already announced does not return", () => {
    const t = setup(); t.update([]); t.update([item("a", 2000)]); t.update([]); t.update([item("a", 2000)]);
    expect(t.shown).toEqual(["a"]);
  });
  it("notifies again when an announcement is edited back to draft and republished", () => {
    const t = setup(); t.update([]); t.update([item("a", 2000)]); t.update([]); t.update([item("a", 5000)]);
    expect(t.shown).toEqual(["a", "a"]);
  });
  it("holds notifications while the tab is hidden and shows them once on return", () => {
    const t = setup(); t.update([]); t.update([item("a", 2000)], false); expect(t.shown).toEqual([]);
    t.tracker.flush(); t.tracker.flush(); expect(t.shown).toEqual(["a"]);
  });
  it("re-baselines when the edition changes instead of announcing the other edition's notices", () => {
    const shown = vi.fn(); const tracker = createAnnouncementTracker(shown);
    tracker.update("one", [item("a")], true); tracker.update("two", [item("z")], true); expect(shown).not.toHaveBeenCalled();
  });
  it("only treats a published item with a time as announceable", () => {
    const seen = new Map(); expect(takeNewAnnouncements([{ _id: "x", title: "x", body: "x" }], seen, false)).toEqual([]);
  });
  it("builds a short single-line preview", () => {
    expect(announcementPreview("Short\n\nnote")).toBe("Short note");
    const long = announcementPreview("word ".repeat(100)); expect(long.length).toBeLessThanOrEqual(141); expect(long.endsWith("…")).toBe(true);
  });
});
