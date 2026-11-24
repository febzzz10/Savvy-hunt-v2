export type PublishedAnnouncement = { _id: string; title: string; body: string; publishedAt?: number };
/** Announcement id -> the publishedAt value we have already notified about (or baselined). */
export type SeenAnnouncements = Map<string, number>;

/**
 * Returns announcements that became published since `seen` was recorded, oldest first, and records them.
 * The first snapshot is a baseline: it is remembered but never announced. A draft that is edited and
 * republished gets a new publishedAt, so it notifies again; an unchanged item never does. Items that
 * disappear (reverted to draft or deleted) stay remembered and are simply never announced.
 */
export function takeNewAnnouncements(items: readonly PublishedAnnouncement[], seen: SeenAnnouncements, baseline: boolean): PublishedAnnouncement[] {
  const fresh: PublishedAnnouncement[] = [];
  for (const item of items) {
    const stamp = item.publishedAt ?? 0;
    const previous = seen.get(item._id);
    if (previous !== undefined && previous >= stamp) continue;
    seen.set(item._id, stamp);
    if (!baseline && item.publishedAt) fresh.push(item);
  }
  return fresh.sort((a, b) => (a.publishedAt ?? 0) - (b.publishedAt ?? 0));
}

export function announcementPreview(body: string, max = 140) {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(" "), max - 20)).trimEnd()}…`;
}

export const announcementAnchor = (id: string) => `announcement-${id}`;

/**
 * Stateful wrapper used by the notifier: baselines per edition, holds notifications while the tab is
 * hidden (so they are not missed), and hands each one to `show` exactly once.
 */
export function createAnnouncementTracker(initialShow: (item: PublishedAnnouncement) => void = () => {}) {
  let show = initialShow, seen: SeenAnnouncements = new Map(), edition: string | undefined, held: PublishedAnnouncement[] = [];
  return {
    setShow(next: (item: PublishedAnnouncement) => void) { show = next; },
    update(editionId: string, items: readonly PublishedAnnouncement[], visible: boolean) {
      const baseline = edition !== editionId;
      if (baseline) { seen = new Map(); held = []; edition = editionId; }
      const fresh = takeNewAnnouncements(items, seen, baseline);
      if (visible) fresh.forEach(show); else held.push(...fresh);
    },
    flush() { held.splice(0).forEach(show); },
  };
}
