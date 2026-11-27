import type { MetadataRoute } from "next";
import { api } from "@/convex/_generated/api";
import { SITE_URL, publicQuery } from "@/lib/site";

// Hourly ISR keeps organizer-published events and categories current without a query per request.
export const revalidate = 3600;

type Page = MetadataRoute.Sitemap[number];
const staticPages: Page[] = [
  // Matches the root canonical tag emitted from metadataBase.
  { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/schedule`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/results`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/scoreboard`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/snapshots`, changeFrequency: "weekly", priority: 0.6 },
  { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${SITE_URL}/team`, changeFrequency: "monthly", priority: 0.4 },
];
// Pages whose content is assembled from event data change whenever an event does.
const followsEvents = new Set([SITE_URL, `${SITE_URL}/schedule`, `${SITE_URL}/results`, `${SITE_URL}/scoreboard`]);

/** lastModified comes only from stored timestamps (event updatedAt); a page with none omits it rather than claiming "now". */
const asDate = (time: number | undefined) => (typeof time === "number" && Number.isFinite(time) ? new Date(time) : undefined);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const data = await publicQuery(async client => {
    const edition = await client.query(api.editions.getCurrent, {});
    if (!edition) return { events: [], categories: [] };
    const [events, categories] = await Promise.all([
      client.query(api.events.listPublic, { editionId: edition._id }),
      client.query(api.categories.listCurrent, { editionId: edition._id }),
    ]);
    return { events, categories };
  });

  const events = data?.events ?? [];
  const newest = (time: number | undefined, previous: number | undefined) => (typeof time === "number" && (previous === undefined || time > previous) ? time : previous);
  const latestOverall = events.reduce<number | undefined>((latest, event) => newest(event.updatedAt, latest), undefined);
  const latestByCategory = new Map<string, number>();
  for (const event of events) {
    const latest = newest(event.updatedAt, latestByCategory.get(String(event.categoryId)));
    if (latest !== undefined) latestByCategory.set(String(event.categoryId), latest);
  }

  const dynamicPages: Page[] = [
    ...(data?.categories ?? []).filter(category => category.isActive).map(category => ({
      url: `${SITE_URL}/scoreboard/${category.slug}`,
      lastModified: asDate(latestByCategory.get(String(category._id))),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...events.map(event => ({
      url: `${SITE_URL}/events/${event.slug}`,
      lastModified: asDate(event.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  const pages = [...staticPages.map(page => followsEvents.has(page.url) ? { ...page, lastModified: asDate(latestOverall) } : page), ...dynamicPages]
    .map(page => page.lastModified ? page : { url: page.url, changeFrequency: page.changeFrequency, priority: page.priority });
  // Slugs are unique per edition; dedupe anyway so a data slip can never emit the same URL twice.
  return [...new Map(pages.map(page => [page.url, page])).values()];
}
