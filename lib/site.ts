import { ConvexHttpClient } from "convex/browser";

/** Canonical production origin used by sitemap, robots and metadata URLs. */
export const SITE_URL = "https://savvy-hunt-v2.vercel.app";

/**
 * Best-effort public Convex read for sitemap and metadata generation.
 * A missing URL or unreachable backend returns null instead of failing a build or a page render.
 */
export async function publicQuery<T>(run: (client: ConvexHttpClient) => Promise<T>): Promise<T | null> {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!url) return null;
  try {
    return await run(new ConvexHttpClient(url));
  } catch {
    return null;
  }
}
