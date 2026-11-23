import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin, requiredText } from "./lib/security";

export const listPublic = query({ args: { editionId: v.id("editions") }, handler: async (ctx, { editionId }) => (await ctx.db.query("announcements").withIndex("by_edition_status", q => q.eq("editionId", editionId).eq("status", "published")).collect()).sort((a, b) => (b.publishedAt ?? 0) - (a.publishedAt ?? 0)).slice(0, 30).map(item => ({ _id: item._id, title: item.title, body: item.body, publishedAt: item.publishedAt })) });
export const listAdmin = query({ args: { editionId: v.id("editions") }, handler: async (ctx, { editionId }) => { await requireAdmin(ctx); return ctx.db.query("announcements").withIndex("by_edition_time", q => q.eq("editionId", editionId)).order("desc").take(100); } });
export const save = mutation({ args: { editionId: v.id("editions"), id: v.optional(v.id("announcements")), title: v.string(), body: v.string() }, handler: async (ctx, args) => {
  const admin = await requireAdmin(ctx), title = requiredText(args.title, "Title"), body = requiredText(args.body, "Announcement"), now = Date.now();
  if (title.length > 120 || body.length > 2000) throw new Error("Announcement is too long");
  if (!await ctx.db.get(args.editionId)) throw new Error("Edition missing");
  let id = args.id;
  if (id) { const old = await ctx.db.get(id); if (!old || old.editionId !== args.editionId) throw new Error("Announcement missing"); await ctx.db.patch(id, { title, body, status: "draft", updatedAt: now }); }
  else id = await ctx.db.insert("announcements", { editionId: args.editionId, title, body, status: "draft", createdBy: admin.authUserId, createdAt: now, updatedAt: now });
  await ctx.db.insert("auditLogs", { editionId: args.editionId, actorAuthUserId: admin.authUserId, action: "announcement.save", entityType: "announcement", entityId: id, summary: title, createdAt: now });
  return id;
} });
export const publish = mutation({ args: { id: v.id("announcements") }, handler: async (ctx, { id }) => {
  const admin = await requireAdmin(ctx), item = await ctx.db.get(id); if (!item) throw new Error("Announcement missing");
  const now = Date.now(); await ctx.db.patch(item._id, { status: "published", publishedAt: now, updatedAt: now });
  await ctx.db.insert("auditLogs", { editionId: item.editionId, actorAuthUserId: admin.authUserId, action: "announcement.published", entityType: "announcement", entityId: item._id, summary: item.title, createdAt: now });
} });
export const remove = mutation({ args: { id: v.id("announcements") }, handler: async (ctx, { id }) => {
  const admin = await requireAdmin(ctx), item = await ctx.db.get(id); if (!item) throw new Error("Announcement missing");
  const now = Date.now(); await ctx.db.delete(item._id);
  await ctx.db.insert("auditLogs", { editionId: item.editionId, actorAuthUserId: admin.authUserId, action: "announcement.delete", entityType: "announcement", entityId: item._id, summary: item.title, createdAt: now });
  return { status: "deleted" as const };
} });
