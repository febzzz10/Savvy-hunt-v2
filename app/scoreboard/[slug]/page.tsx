import type { Metadata } from "next";
import { cache } from "react";
import { api } from "@/convex/_generated/api";
import { publicQuery } from "@/lib/site";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";
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
  return { title: `${name} Scoreboard`, description: `Official ${name} standings and published event results for Savvy Hunt 2026 at MGM School.`, alternates: { canonical: `/scoreboard/${slug}` } };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){
  const {slug}=await params;
  const name=(await loadCategory(slug))?.name ?? "Category";
  const title=`${name} Scoreboard`;
  const description=`Official ${name} standings and published event results for Savvy Hunt 2026 at MGM School.`;
  return <><JsonLd data={pageSchema({ path: `/scoreboard/${slug}`, name: title, description, crumbs: [{ name: "Home", path: "/" }, { name: "Scoreboard", path: "/scoreboard" }, { name, path: `/scoreboard/${slug}` }] })} /><Nav/><main id="main-content" tabIndex={-1} className="shell"><h1>{name} scoreboard</h1><Board slug={slug}/></main></>;
}
