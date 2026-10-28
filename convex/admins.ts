import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requiredText } from "./lib/security";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import schema from "./schema";
export const pageAudit = query({args:{paginationOpts:paginationOptsValidator},returns:paginationResultValidator(schema.doc("auditLogs")),handler:async(ctx,args)=>{await requireAdmin(ctx,"super_admin");return ctx.db.query("auditLogs").withIndex("by_time").order("desc").paginate(args.paginationOpts)}});
export const getSelf = query({args:{},handler: async ctx => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  const admin = await ctx.db.query("admins").withIndex("by_auth_user_id",q=>q.eq("authUserId",identity.tokenIdentifier)).unique();
  return admin?.isActive ? {role:admin.role,displayName:admin.displayName} : null;
}});
export const getIdentityKey = query({args:{},handler:async ctx=>{const identity=await ctx.auth.getUserIdentity();return identity?.tokenIdentifier??null}});
export const bootstrap = mutation({args:{secret:v.string(),displayName:v.string()},handler: async (ctx,args) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED");
  if (!process.env.ADMIN_BOOTSTRAP_SECRET || args.secret !== process.env.ADMIN_BOOTSTRAP_SECRET) throw new Error("FORBIDDEN");
  if ((await ctx.db.query("admins").first())) throw new Error("Bootstrap already completed");
  const now=Date.now();
  return ctx.db.insert("admins",{authUserId:identity.tokenIdentifier,displayName:requiredText(args.displayName,"Display name"),role:"super_admin",isActive:true,createdAt:now,updatedAt:now});
}});
export const listAudit = query({args:{},handler:async ctx=>{await requireAdmin(ctx,"super_admin");return ctx.db.query("auditLogs").withIndex("by_time").order("desc").take(100)}});
export const list = query({args:{},handler:async ctx=>{await requireAdmin(ctx,"super_admin");return ctx.db.query("admins").collect()}});
export const save = mutation({args:{authUserId:v.string(),displayName:v.string(),role:v.union(v.literal("editor"),v.literal("super_admin")),isActive:v.boolean()},handler:async(ctx,args)=>{
  const actor=await requireAdmin(ctx,"super_admin"),authUserId=requiredText(args.authUserId,"Identity key"),displayName=requiredText(args.displayName,"Display name"),now=Date.now();
  const old=await ctx.db.query("admins").withIndex("by_auth_user_id",q=>q.eq("authUserId",authUserId)).unique();
  if(old&&old.authUserId===actor.authUserId&&(!args.isActive||args.role!=="super_admin"))throw new Error("Cannot remove your own super admin access");
  let id=old?._id;
  if(old)await ctx.db.patch(old._id,{displayName,role:args.role,isActive:args.isActive,updatedAt:now});
  else id=await ctx.db.insert("admins",{authUserId,displayName,role:args.role,isActive:args.isActive,createdAt:now,updatedAt:now});
  await ctx.db.insert("auditLogs",{actorAuthUserId:actor.authUserId,action:"admin.save",entityType:"admin",entityId:id!,summary:`${displayName}: ${args.role}, ${args.isActive?"active":"revoked"}`,createdAt:now});return id;
}});
