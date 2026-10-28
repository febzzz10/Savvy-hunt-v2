import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requiredText } from "./lib/security";
export const listActive=query({args:{editionId:v.id("editions")},handler:async(ctx,{editionId})=>(await ctx.db.query("schools").withIndex("by_edition",q=>q.eq("editionId",editionId)).collect()).filter(s=>s.status==="active").map(s=>({_id:s._id,name:s.name,logoRef:s.logoRef}))});
export const listAdmin=query({args:{editionId:v.id("editions")},handler:async(ctx,{editionId})=>{await requireAdmin(ctx);return ctx.db.query("schools").withIndex("by_edition",q=>q.eq("editionId",editionId)).collect()}});
export const save=mutation({args:{editionId:v.id("editions"),id:v.optional(v.id("schools")),name:v.string(),code:v.optional(v.string()),status:v.optional(v.union(v.literal("active"),v.literal("archived")))},handler:async(ctx,args)=>{
  const admin=await requireAdmin(ctx),name=requiredText(args.name,"School name"),code=args.code?.trim().toUpperCase()||undefined,now=Date.now();
  if(name.length>120||code&&code.length>24)throw new Error("School name or code is too long");
  if(!await ctx.db.get(args.editionId)) throw new Error("Edition missing");
  const schools=await ctx.db.query("schools").withIndex("by_edition",q=>q.eq("editionId",args.editionId)).collect();
  if(schools.some(s=>s._id!==args.id && (s.name.toLowerCase()===name.toLowerCase() || (code && s.code===code)))) throw new Error("School name or code already exists");
  let id=args.id;
  if(id){const old=await ctx.db.get(id);if(!old||old.editionId!==args.editionId)throw new Error("School missing");await ctx.db.patch(id,{name,code,status:args.status??old.status,updatedAt:now})}
  else id=await ctx.db.insert("schools",{editionId:args.editionId,name,code,status:args.status??"active",createdAt:now,updatedAt:now});
  await ctx.db.insert("auditLogs",{editionId:args.editionId,actorAuthUserId:admin.authUserId,action:args.id?"school.update":"school.create",entityType:"school",entityId:id,summary:name,createdAt:now});
  return id;
}});
