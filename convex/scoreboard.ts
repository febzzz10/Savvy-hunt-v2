import { query } from "./_generated/server";
import { v } from "convex/values";
import { rank } from "./lib/scoring";
import { requireAdmin } from "./lib/security";
export const getOverall=query({args:{editionId:v.id("editions")},handler:async(ctx,{editionId})=>{
  const schools=(await ctx.db.query("schools").withIndex("by_edition",q=>q.eq("editionId",editionId)).collect()).filter(s=>s.status==="active");
  const totals=await ctx.db.query("schoolCategoryTotals").withIndex("by_edition_category",q=>q.eq("editionId",editionId)).collect();
  return rank(schools.map(s=>({id:s._id,name:s.name,points:totals.filter(t=>t.schoolId===s._id).reduce((n,t)=>n+t.points,0)})));
}});
export const getCategory=query({args:{editionId:v.id("editions"),categoryId:v.id("categories")},handler:async(ctx,args)=>{
  const category=await ctx.db.get(args.categoryId);if(!category||category.editionId!==args.editionId)throw new Error("Invalid category");
  const schools=(await ctx.db.query("schools").withIndex("by_edition",q=>q.eq("editionId",args.editionId)).collect()).filter(s=>s.status==="active");
  const totals=await ctx.db.query("schoolCategoryTotals").withIndex("by_edition_category",q=>q.eq("editionId",args.editionId).eq("categoryId",args.categoryId)).collect();
  return rank(schools.map(s=>({id:s._id,name:s.name,points:totals.find(t=>t.schoolId===s._id)?.points??0})));
}});
export const getContributionBreakdown=query({args:{schoolId:v.id("schools")},handler:async(ctx,{schoolId})=>{
  await requireAdmin(ctx);const school=await ctx.db.get(schoolId);if(!school)throw new Error("School missing");
  const events=await ctx.db.query("events").withIndex("by_edition_start",q=>q.eq("editionId",school.editionId)).collect();
  const rows=[];
  for(const event of events){if(!event.activePublishedRevisionId)continue;const entries=await ctx.db.query("resultEntries").withIndex("by_event_school",q=>q.eq("eventId",event._id).eq("schoolId",schoolId)).collect();const points=entries.filter(entry=>entry.revisionId===event.activePublishedRevisionId).reduce((sum,entry)=>sum+entry.points,0);if(points)rows.push({eventId:event._id,eventTitle:event.title,categoryId:event.categoryId,points})}
  return rows;
}});
