import { ConvexHttpClient } from "convex/browser";

/** Canonical production origin used by sitemap, robots, metadata and structured data. */
export const SITE_URL = "https://savvy-hunt-v2.vercel.app";
export const SITE_NAME = "Savvy Hunt";
export const SITE_YEAR = "2026";
/**
 * Owner-supplied school identity, kept in one place so no page invents a different name.
 * No street address, phone or affiliation is claimed because none is recorded in the project.
 */
export const SCHOOL_NAME = "MGM School";
export const SCHOOL_LOCATION = "Kottarakara";
/** The school's own website (owner-supplied 2026-11-28). */
export const SCHOOL_URL = "https://mgmschool.com/";
export const SCHOOL_ALTERNATE_NAMES = ["MGM CPS", "MGM School Kottarakara"];
/**
 * Event facts the project does not record yet. Leave undefined until the organizers confirm them:
 * the Event JSON-LD node and the "When is it?" FAQ answer only use a value once it is set here.
 * Use ISO 8601 (for example "2026-12-12" or "2026-12-12T09:00:00+05:30").
 */
export const EVENT_START_DATE: string | undefined = undefined;
export const EVENT_END_DATE: string | undefined = undefined;

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
