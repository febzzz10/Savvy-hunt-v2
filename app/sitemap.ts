import type { MetadataRoute } from "next";
import { api } from "@/convex/_generated/api";
import { SITE_URL, publicQuery } from "@/lib/site";

// Hourly ISR keeps organizer-published events and categories current without a query per request.
export const revalidate = 3600;

const staticPages: MetadataRoute.Sitemap = [
  // Matches the root canonical tag emitted from metadataBase.
  { url: SITE_URL, changeFrequency: "daily", priority: 1 },
  { url: `${SITE_URL}/schedule`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/results`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/scoreboard`, changeFrequency: "daily", priority: 0.9 },
  { url: `${SITE_URL}/snapshots`, changeFrequency: "weekly", priority: 0.6 },
  { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
  { url: `${SITE_URL}/team`, changeFrequency: "monthly", priority: 0.4 },
];

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

  const dynamicPages: MetadataRoute.Sitemap = [
    ...(data?.categories ?? []).filter(category => category.isActive).map(category => ({
      url: `${SITE_URL}/scoreboard/${category.slug}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...(data?.events ?? []).map(event => ({
      url: `${SITE_URL}/events/${event.slug}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];

  // Slugs are unique per edition; dedupe anyway so a data slip can never emit the same URL twice.
  return [...new Map([...staticPages, ...dynamicPages].map(page => [page.url, page])).values()];
}
