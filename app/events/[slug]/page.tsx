import type { Metadata } from "next";
import Link from "next/link";
import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { publicQuery } from "@/lib/site";
import { JsonLd } from "@/components/structured-data";
import { eventMeta, pageSchema } from "@/lib/structured-data";
import {Nav,EventDetail} from "@/components/public";

// React cache dedupes the lookup shared by generateMetadata and the page within one request.
const loadEvent = cache((slug: string) => publicQuery(async client => {
  const edition = await client.query(api.editions.getCurrent, {});
  if (!edition) return null;
  const event = await client.query(api.events.getPublicBySlug, { editionId: edition._id, slug });
  if (!event) return null;
  const categories = await client.query(api.categories.listCurrent, { editionId: edition._id });
  return { event, category: categories.find(item => item._id === event.categoryId) ?? null };
}));

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const loaded=await loadEvent(slug);
  const meta=eventMeta(loaded?.event.title ?? "Event", loaded?.event.venue);
  return { title: { absolute: meta.title }, description: meta.description, alternates: { canonical: `/events/${slug}` } };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const loaded=await loadEvent(slug);
  const title=loaded?.event.title ?? "Event";
  const category=loaded?.category;
  const meta=eventMeta(title, loaded?.event.venue);
  return <><JsonLd data={pageSchema({ path: `/events/${slug}`, name: meta.title, description: meta.description, crumbs: [{ name: "Home", path: "/" }, { name: "Events", path: "/schedule" }, { name: title, path: `/events/${slug}` }] })} /><Nav/><main id="main-content" tabIndex={-1} className="shell">
    <h1>{title} Results – MGM Savvy Hunt 2026</h1>
    <p className="muted">{title} is part of {category ? `${category.name} at ` : "the programme at "}Savvy Hunt 2026, hosted by MGM School, Kottarakara. Official winners, placements and points appear below once the organizers publish them. Compare schools on the {category ? <Link href={`/scoreboard/${category.slug}`}>{category.name} live scoreboard</Link> : <Link href="/scoreboard">live scoreboard</Link>}, browse <Link href="/results">all event results</Link> or return to the <Link href="/schedule">event schedule</Link>.</p>
    <EventDetail slug={slug}/></main></>;
}
