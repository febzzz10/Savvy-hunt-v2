import { internalMutation, mutation, query } from "./_generated/server";
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
// Deployment-owner CLI/dashboard only. Never call this from a public function.
export const bootstrap = internalMutation({
  args: { authUserId: v.string(), displayName: v.string() },
  returns: v.id("admins"),
  handler: async (ctx, args) => {
    // Reading both ranges in this transaction also serializes competing attempts.
    if (await ctx.db.query("adminBootstrapState").first() || await ctx.db.query("admins").first()) {
      throw new Error("Bootstrap already completed; an existing super admin must grant access");
    }
    const issuer = process.env.CLERK_JWT_ISSUER_DOMAIN;
    if (!issuer) throw new Error("CLERK_JWT_ISSUER_DOMAIN is required");
    const authUserId = requiredText(args.authUserId, "Identity key");
    const prefix = `${issuer}|`;
    const subject = authUserId.slice(prefix.length);
    if (!authUserId.startsWith(prefix) || !subject.trim() || subject.includes("|")) {
      throw new Error("Copy the complete identity key from /admin/request-access for this deployment");
    }
    const displayName = requiredText(args.displayName, "Display name");
    const now = Date.now();
    const id = await ctx.db.insert("admins", { authUserId, displayName, role: "super_admin", isActive: true, createdAt: now, updatedAt: now });
    // Keep this record even if an admin is later revoked or deleted.
    await ctx.db.insert("adminBootstrapState", { authUserId, adminId: id, completedAt: now });
    await ctx.db.insert("auditLogs", { actorAuthUserId: authUserId, action: "admin.bootstrap", entityType: "admin", entityId: id, summary: `${displayName}: initial super admin provisioned by deployment owner`, createdAt: now });
    return id;
  },
});
// Upgrade pre-marker installations without granting or reactivating any account.
export const sealBootstrap = internalMutation({
  args: {},
  returns: v.null(),
  handler: async ctx => {
    if (await ctx.db.query("adminBootstrapState").first()) return null;
    const first = await ctx.db.query("admins").first();
    if (!first) throw new Error("No admin exists; use the initial bootstrap");
    const now = Date.now();
    await ctx.db.insert("adminBootstrapState", { authUserId: first.authUserId, adminId: first._id, completedAt: now });
    await ctx.db.insert("auditLogs", { actorAuthUserId: "system:bootstrap-seal", action: "admin.bootstrap.sealed", entityType: "admin", entityId: first._id, summary: "Deployment owner permanently closed initial setup for an existing installation", createdAt: now });
    return null;
  },
});
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
