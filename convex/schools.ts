import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requiredText } from "./lib/security";
export const listPublic=query({args:{editionId:v.id("editions")},handler:async(ctx,{editionId})=>(await ctx.db.query("schools").withIndex("by_edition",q=>q.eq("editionId",editionId)).collect()).map(s=>({_id:s._id,name:s.name,logoRef:s.logoRef}))});
export const listAdmin=query({args:{editionId:v.id("editions")},handler:async(ctx,{editionId})=>{await requireAdmin(ctx);return ctx.db.query("schools").withIndex("by_edition",q=>q.eq("editionId",editionId)).collect()}});
export const save=mutation({args:{editionId:v.id("editions"),id:v.optional(v.id("schools")),name:v.string()},handler:async(ctx,args)=>{
  const admin=await requireAdmin(ctx),name=requiredText(args.name,"School name"),now=Date.now();
  if(name.length>120)throw new Error("School name is too long");
  if(!await ctx.db.get(args.editionId)) throw new Error("Edition missing");
  const schools=await ctx.db.query("schools").withIndex("by_edition",q=>q.eq("editionId",args.editionId)).collect();
  if(schools.some(s=>s._id!==args.id && s.name.toLowerCase()===name.toLowerCase())) throw new Error("School name already exists");
  let id=args.id;
  if(id){const old=await ctx.db.get(id);if(!old||old.editionId!==args.editionId)throw new Error("School missing");await ctx.db.patch(id,{name,updatedAt:now})}
  else id=await ctx.db.insert("schools",{editionId:args.editionId,name,createdAt:now,updatedAt:now});
  await ctx.db.insert("auditLogs",{editionId:args.editionId,actorAuthUserId:admin.authUserId,action:args.id?"school.update":"school.create",entityType:"school",entityId:id,summary:name,createdAt:now});
  return id;
}});

const PUBLISHED_HISTORY = "This school has published results or scoreboard history and cannot be deleted.";
export const remove=mutation({args:{editionId:v.id("editions"),schoolId:v.id("schools"),expectedUpdatedAt:v.number()},returns:v.object({status:v.literal("deleted")}),handler:async(ctx,args)=>{
  const admin=await requireAdmin(ctx),school=await ctx.db.get(args.schoolId);
  if(!school||school.editionId!==args.editionId)throw new Error("School missing");
  if(school.updatedAt!==args.expectedUpdatedAt)throw new ConvexError("STALE_SCHOOL");
  // Totals rows are created on first publication and retained through correction and revoke.
  if(await ctx.db.query("schoolCategoryTotals").withIndex("by_edition_school",q=>q.eq("editionId",args.editionId).eq("schoolId",school._id)).first())throw new Error(PUBLISHED_HISTORY);
  const events=await ctx.db.query("events").withIndex("by_edition_created",q=>q.eq("editionId",args.editionId)).collect(),draftEntries=[],draftRevisions=new Set<Id<"resultRevisions">>();
  for(const event of events){
    for(const entry of await ctx.db.query("resultEntries").withIndex("by_event_school",q=>q.eq("eventId",event._id).eq("schoolId",school._id)).collect()){
      const revision=await ctx.db.get(entry.revisionId);
      if(!revision||revision.status!=="draft")throw new Error(PUBLISHED_HISTORY);
      draftEntries.push(entry._id);draftRevisions.add(revision._id);
    }
  }
  const now=Date.now();
  for(const entryId of draftEntries)await ctx.db.delete(entryId);
  for(const revisionId of draftRevisions){
    if(await ctx.db.query("resultEntries").withIndex("by_revision",q=>q.eq("revisionId",revisionId)).first())continue;
    const revision=await ctx.db.get(revisionId);if(!revision)continue;
    await ctx.db.delete(revisionId);
    const event=events.find(row=>row._id===revision.eventId);
    if(event&&!event.activePublishedRevisionId)await ctx.db.patch(event._id,{resultStatus:"none",updatedAt:now});
  }
  for(const event of events){
    if(!event.participatingSchoolIds?.includes(school._id))continue;
    await ctx.db.patch(event._id,{participatingSchoolIds:event.participatingSchoolIds.filter(id=>id!==school._id),updatedAt:now});
  }
  await ctx.db.delete(school._id);
  await ctx.db.insert("auditLogs",{editionId:args.editionId,actorAuthUserId:admin.authUserId,action:"school.delete",entityType:"school",entityId:school._id,summary:school.name,before:{name:school.name},createdAt:now});
  return {status:"deleted" as const};
}});
