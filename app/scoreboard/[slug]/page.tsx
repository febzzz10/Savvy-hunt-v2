import type { Metadata } from "next";
import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { publicQuery } from "@/lib/site";
import { JsonLd } from "@/components/structured-data";
import Link from "next/link";
import { categoryMeta, pageSchema } from "@/lib/structured-data";
import {Nav,Board} from "@/components/public";

// React cache dedupes the lookup shared by generateMetadata and the page within one request.
const loadCategory = cache((slug: string) => publicQuery(async client => {
  const edition = await client.query(api.editions.getCurrent, {});
  if (!edition) return null;
  const categories = await client.query(api.categories.listCurrent, { editionId: edition._id });
  return categories.find(item => item.slug === slug && item.isActive) ?? null;
}));

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const name=(await loadCategory(slug))?.name ?? "Category";
  const meta=categoryMeta(name);
  return { title: { absolute: meta.title }, description: meta.description, alternates: { canonical: `/scoreboard/${slug}` } };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const name=(await loadCategory(slug))?.name ?? "Category";
  const { title, description }=categoryMeta(name);
  return <><JsonLd data={pageSchema({ path: `/scoreboard/${slug}`, name: title, description, crumbs: [{ name: "Home", path: "/" }, { name: "Scoreboard", path: "/scoreboard" }, { name, path: `/scoreboard/${slug}` }] })} /><Nav/><main id="main-content" tabIndex={-1} className="shell"><h1>{name} Savvy Hunt 2026 Live Scoreboard</h1><p className="muted">Live points table for {name} at MGM School, Kottarakara, ranked school by school from official results. Compare with the <Link href="/scoreboard">overall Savvy Hunt scoreboard</Link>, read the <Link href="/results">event-wise results</Link> or check the <Link href="/schedule">event schedule</Link>.</p><Board slug={slug}/></main></>;
}
