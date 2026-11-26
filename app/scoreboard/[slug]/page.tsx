import type { Metadata } from "next";
import { api } from "@/convex/_generated/api";
import { publicQuery } from "@/lib/site";
import {Nav,Board} from "@/components/public";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const category=await publicQuery(async client=>{
    const edition=await client.query(api.editions.getCurrent,{});
    if(!edition) return null;
    const categories=await client.query(api.categories.listCurrent,{editionId:edition._id});
    return categories.find(item=>item.slug===slug&&item.isActive)??null;
  });
  const name=category?.name??"Category";
  return { title: `${name} scoreboard`, description: `Official ${name} standings and published event results for the current Savvy Hunt edition.`, alternates: { canonical: `/scoreboard/${slug}` } };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <><Nav/><main id="main-content" tabIndex={-1} className="shell"><h1>Category scoreboard</h1><Board slug={slug}/></main></>}
