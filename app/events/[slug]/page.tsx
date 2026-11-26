import type { Metadata } from "next";
import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { publicQuery } from "@/lib/site";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";
import {Nav,EventDetail} from "@/components/public";

// React cache dedupes the lookup shared by generateMetadata and the page within one request.
const loadEvent = cache((slug: string) => publicQuery(async client => {
  const edition = await client.query(api.editions.getCurrent, {});
  return edition ? client.query(api.events.getPublicBySlug, { editionId: edition._id, slug }) : null;
}));

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const event=await loadEvent(slug);
  const title=event?.title ?? "Event";
  return { title, description: event?.description?.trim() || `${title} at Savvy Hunt 2026, MGM School: event status, venue and official published results.`, alternates: { canonical: `/events/${slug}` } };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const event=await loadEvent(slug);
  const title=event?.title ?? "Event";
  const description=event?.description?.trim() || `${title} at Savvy Hunt 2026, MGM School: event status, venue and official published results.`;
  return <><JsonLd data={pageSchema({ path: `/events/${slug}`, name: title, description, crumbs: [{ name: "Home", path: "/" }, { name: "Events", path: "/schedule" }, { name: title, path: `/events/${slug}` }] })} /><Nav/><main id="main-content" tabIndex={-1} className="shell"><EventDetail slug={slug}/></main></>;
}
