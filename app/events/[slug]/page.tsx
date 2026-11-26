import type { Metadata } from "next";
import { api } from "@/convex/_generated/api";
import { publicQuery } from "@/lib/site";
import {Nav,EventDetail} from "@/components/public";

export async function generateMetadata({params}:{params:Promise<{slug:string}>}):Promise<Metadata>{
  const {slug}=await params;
  const event=await publicQuery(async client=>{
    const edition=await client.query(api.editions.getCurrent,{});
    return edition?client.query(api.events.getPublicBySlug,{editionId:edition._id,slug}):null;
  });
  const title=event?.title??"Event";
  return { title, description: `Official schedule, venue and published results for ${title} at Savvy Hunt.`, alternates: { canonical: `/events/${slug}` } };
}

export default async function Page({params}:{params:Promise<{slug:string}>}){const {slug}=await params;return <><Nav/><main id="main-content" tabIndex={-1} className="shell"><EventDetail slug={slug}/></main></>}
