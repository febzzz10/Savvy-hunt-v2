import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requiredText, slugify } from "./lib/security";
const labels=["Category I","Category II","Category III","Category IV","Category V","Common Category"];
export const getCurrent=query({args:{},handler:async ctx=>ctx.db.query("editions").withIndex("by_current",q=>q.eq("isCurrent",true)).unique()});
export const initialize=mutation({args:{name:v.string(),year:v.number()},handler:async(ctx,args)=>{
  const admin=await requireAdmin(ctx,"super_admin");
  if(await ctx.db.query("editions").withIndex("by_current",q=>q.eq("isCurrent",true)).first()) throw new Error("Current edition exists");
  if(!Number.isSafeInteger(args.year)||args.year<2000) throw new Error("Invalid year");
  const now=Date.now(),name=requiredText(args.name,"Edition name");
  const id=await ctx.db.insert("editions",{name,slug:slugify(name),year:args.year,timezone:"Asia/Kolkata",status:"active",isCurrent:true,createdAt:now,updatedAt:now});
  for(const [sortOrder,label] of labels.entries()) await ctx.db.insert("categories",{editionId:id,name:label,slug:slugify(label),sortOrder,isActive:true});
  await ctx.db.insert("siteSettings",{editionId:id,eventTitle:"Savvy Hunt",updatedAt:now});
  await ctx.db.insert("auditLogs",{editionId:id,actorAuthUserId:admin.authUserId,action:"edition.initialize",entityType:"edition",entityId:id,summary:name,createdAt:now});
  return id;
}});
