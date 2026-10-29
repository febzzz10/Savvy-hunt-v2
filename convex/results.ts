import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireAdmin } from "./lib/security";
import { contributions, deltas, sameEntries } from "./lib/scoring";
const entry=v.object({schoolId:v.id("schools"),points:v.number(),placement:v.optional(v.number()),entryLabel:v.optional(v.string())});
async function rows(ctx: QueryCtx | MutationCtx,revisionId:Id<"resultRevisions">){return ctx.db.query("resultEntries").withIndex("by_revision",q=>q.eq("revisionId",revisionId)).collect()}
export const getPublishedByEvent=query({args:{eventId:v.id("events")},handler:async(ctx,{eventId})=>{
  const event=await ctx.db.get(eventId);if(!event?.activePublishedRevisionId)return [];
  return Promise.all((await rows(ctx,event.activePublishedRevisionId)).map(async r=>({schoolId:r.schoolId,schoolName:(await ctx.db.get(r.schoolId))?.name??"Archived school",points:r.points,placement:r.placement,entryLabel:r.entryLabel,sortOrder:r.sortOrder})));
}});
export const listRecentPublished=query({args:{editionId:v.id("editions"),limit:v.number()},handler:async(ctx,args)=>{
  const limit=Math.min(50,Math.max(1,Math.floor(args.limit)));const events=await ctx.db.query("events").withIndex("by_edition_start",q=>q.eq("editionId",args.editionId)).collect();const published=events.filter(event=>event.activePublishedRevisionId);
  const results=[];
  for(const event of published){const revision=await ctx.db.get(event.activePublishedRevisionId!);if(!revision)continue;const entries=await rows(ctx,revision._id);results.push({eventId:event._id,eventTitle:event.title,eventSlug:event.slug,categoryId:event.categoryId,publishedAt:revision.publishedAt??0,entries:await Promise.all(entries.map(async row=>({schoolId:row.schoolId,schoolName:(await ctx.db.get(row.schoolId))?.name??"Archived school",points:row.points,placement:row.placement,entryLabel:row.entryLabel})))})}
  return results.sort((a,b)=>b.publishedAt-a.publishedAt).slice(0,limit);
}});
export const getAdminByEvent=query({args:{eventId:v.id("events")},handler:async(ctx,{eventId})=>{
  await requireAdmin(ctx);const event=await ctx.db.get(eventId);if(!event)throw new Error("Event missing");
  const revisions=await ctx.db.query("resultRevisions").withIndex("by_event",q=>q.eq("eventId",eventId)).collect();
  const draft=revisions.find(r=>r.status==="draft");return {event,draft,draftEntries:draft?await rows(ctx,draft._id):[],officialEntries:event.activePublishedRevisionId?await rows(ctx,event.activePublishedRevisionId):[],revisions};
}});
export const saveDraft=mutation({args:{eventId:v.id("events"),entries:v.array(entry),reason:v.optional(v.string()),expectedDraftVersion:v.optional(v.number())},returns:v.id("resultRevisions"),handler:async(ctx,args)=>{
  const admin=await requireAdmin(ctx),event=await ctx.db.get(args.eventId);if(!event)throw new Error("Event missing");
  if(args.entries.length>200)throw new Error("Too many entries");
  const officialRows=event.activePublishedRevisionId?await rows(ctx,event.activePublishedRevisionId):[];
  for(const item of args.entries){const school=await ctx.db.get(item.schoolId);if(!school||school.editionId!==event.editionId||school.status!=="active"&&!officialRows.some(row=>row.schoolId===item.schoolId))throw new Error("Invalid school");if(event.participatingSchoolIds?.length&&!event.participatingSchoolIds.includes(item.schoolId))throw new Error("School is not assigned to this event");if(!Number.isSafeInteger(item.points)||item.points<0)throw new Error("Invalid points");if(item.placement!==undefined&&(!Number.isSafeInteger(item.placement)||item.placement<1))throw new Error("Invalid placement")}
  const revisions=await ctx.db.query("resultRevisions").withIndex("by_event",q=>q.eq("eventId",args.eventId)).collect();
  let draft=revisions.find(r=>r.status==="draft");const now=Date.now();
  if(!draft){const id=await ctx.db.insert("resultRevisions",{eventId:args.eventId,revisionNumber:Math.max(0,...revisions.map(r=>r.revisionNumber))+1,status:"draft",draftVersion:1,correctionOfRevisionId:event.activePublishedRevisionId,changeReason:args.reason?.trim(),createdBy:admin.authUserId,createdAt:now});draft=(await ctx.db.get(id))!}
  else {if(args.expectedDraftVersion!==(draft.draftVersion??0))throw new Error("STALE_DRAFT");await ctx.db.patch(draft._id,{changeReason:args.reason?.trim(),draftVersion:(draft.draftVersion??0)+1});for(const old of await rows(ctx,draft._id))await ctx.db.delete(old._id)}
  for(const [sortOrder,item] of args.entries.entries())await ctx.db.insert("resultEntries",{revisionId:draft._id,eventId:args.eventId,schoolId:item.schoolId,points:item.points,placement:item.placement,entryLabel:item.entryLabel?.trim(),sortOrder});
  if(!event.activePublishedRevisionId)await ctx.db.patch(event._id,{resultStatus:"draft",updatedAt:now});
  await ctx.db.insert("auditLogs",{editionId:event.editionId,actorAuthUserId:admin.authUserId,action:"results.saveDraft",entityType:"event",entityId:event._id,summary:`Saved draft revision ${draft.revisionNumber}`,createdAt:now});return draft._id;
}});
export const preview=query({args:{eventId:v.id("events"),draftRevisionId:v.id("resultRevisions")},handler:async(ctx,args)=>{
  await requireAdmin(ctx);const event=await ctx.db.get(args.eventId),draft=await ctx.db.get(args.draftRevisionId);if(!event||!draft||draft.eventId!==event._id||draft.status!=="draft")throw new Error("Invalid draft");
  const old=event.activePublishedRevisionId?await rows(ctx,event.activePublishedRevisionId):[],next=await rows(ctx,draft._id);
  return {expectedActiveRevisionId:event.activePublishedRevisionId??null,expectedDraftVersion:draft.draftVersion??0,changes:[...deltas(old,next)].map(([schoolId,delta])=>({schoolId,oldPoints:contributions(old).get(schoolId)??0,newPoints:contributions(next).get(schoolId)??0,delta}))};
}});
export const publish=mutation({args:{eventId:v.id("events"),draftRevisionId:v.id("resultRevisions"),expectedActiveRevisionId:v.union(v.id("resultRevisions"),v.null()),expectedDraftVersion:v.number()},returns:v.object({status:v.union(v.literal("already_published"),v.literal("published"),v.literal("unchanged"))}),handler:async(ctx,args)=>{
  const admin=await requireAdmin(ctx,"super_admin"),event=await ctx.db.get(args.eventId),draft=await ctx.db.get(args.draftRevisionId);if(!event||!draft||draft.eventId!==event._id)throw new Error("Invalid result revision");
  if(event.activePublishedRevisionId===draft._id)return {status:"already_published" as const};
  if(draft.status!=="draft")throw new Error("Revision is not a draft");
  if((event.activePublishedRevisionId??null)!==args.expectedActiveRevisionId)throw new Error("STALE_REVISION");
  if((draft.draftVersion??0)!==args.expectedDraftVersion)throw new Error("STALE_DRAFT");
  if(event.activePublishedRevisionId&&!draft.changeReason?.trim())throw new Error("Correction reason required");
  const old=event.activePublishedRevisionId?await rows(ctx,event.activePublishedRevisionId):[],next=await rows(ctx,draft._id);
  if(!next.length)throw new Error("Cannot publish empty results");
  contributions(next);
  for(const item of next){const school=await ctx.db.get(item.schoolId);if(!school||school.editionId!==event.editionId)throw new Error("Invalid school in draft")}
  if(event.activePublishedRevisionId&&sameEntries(old,next))return {status:"unchanged" as const};
  const now=Date.now();
  for(const [schoolId,delta] of deltas(old,next)){
    const total=await ctx.db.query("schoolCategoryTotals").withIndex("by_school_category",q=>q.eq("editionId",event.editionId).eq("schoolId",schoolId).eq("categoryId",event.categoryId)).unique();
    const points=(total?.points??0)+delta;if(points<0||!Number.isSafeInteger(points))throw new Error("Score invariant violated");
    const existingTotals=await ctx.db.query("schoolCategoryTotals").withIndex("by_edition_school",q=>q.eq("editionId",event.editionId).eq("schoolId",schoolId)).collect();
    const overall=existingTotals.reduce((sum,item)=>sum+item.points,0)+delta;if(!Number.isSafeInteger(overall)||overall<0)throw new Error("Overall score exceeds the safe integer range");
    if(total)await ctx.db.patch(total._id,{points,updatedAt:now});else await ctx.db.insert("schoolCategoryTotals",{editionId:event.editionId,schoolId,categoryId:event.categoryId,points,updatedAt:now});
  }
  if(event.activePublishedRevisionId)await ctx.db.patch(event.activePublishedRevisionId,{status:"superseded"});
  await ctx.db.patch(draft._id,{status:"published",publishedBy:admin.authUserId,publishedAt:now});
  await ctx.db.patch(event._id,{activePublishedRevisionId:draft._id,resultStatus:"published",updatedAt:now});
  await ctx.db.insert("auditLogs",{editionId:event.editionId,actorAuthUserId:admin.authUserId,action:"results.publish",entityType:"event",entityId:event._id,summary:`Published revision ${draft.revisionNumber}`,reason:draft.changeReason,createdAt:now});return {status:"published" as const};
}});
export const revoke=mutation({args:{eventId:v.id("events"),reason:v.string(),expectedActiveRevisionId:v.union(v.id("resultRevisions"),v.null())},returns:v.object({status:v.union(v.literal("already_revoked"),v.literal("revoked"))}),handler:async(ctx,args)=>{
  const admin=await requireAdmin(ctx,"super_admin"),event=await ctx.db.get(args.eventId);if(!event)throw new Error("Event missing");if(!args.reason.trim())throw new Error("Reason required");if(!event.activePublishedRevisionId)return {status:"already_revoked" as const};
  if(event.activePublishedRevisionId!==args.expectedActiveRevisionId)throw new Error("STALE_REVISION");
  const now=Date.now(),old=await rows(ctx,event.activePublishedRevisionId);
  for(const [schoolId,points] of contributions(old)){
    const total=await ctx.db.query("schoolCategoryTotals").withIndex("by_school_category",q=>q.eq("editionId",event.editionId).eq("schoolId",schoolId).eq("categoryId",event.categoryId)).unique();
    if(!total||total.points<points)throw new Error("Score invariant violated");await ctx.db.patch(total._id,{points:total.points-points,updatedAt:now});
  }
  await ctx.db.patch(event.activePublishedRevisionId,{status:"revoked"});const hasDraft=await ctx.db.query("resultRevisions").withIndex("by_event_status",q=>q.eq("eventId",event._id).eq("status","draft")).first();await ctx.db.patch(event._id,{activePublishedRevisionId:undefined,resultStatus:hasDraft?"draft":"none",updatedAt:now});
  await ctx.db.insert("auditLogs",{editionId:event.editionId,actorAuthUserId:admin.authUserId,action:"results.revoke",entityType:"event",entityId:event._id,summary:"Revoked official results",reason:args.reason.trim(),createdAt:now});return {status:"revoked" as const};
}});
