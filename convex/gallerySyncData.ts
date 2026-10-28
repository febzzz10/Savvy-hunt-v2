import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import schema from "./schema";
import { requireAdmin } from "./lib/security";
import { internal } from "./_generated/api";

export const getState = query({
  args: { editionId: v.id("editions") }, returns: v.union(schema.doc("gallerySyncState"), v.null()),
  handler: async (ctx, { editionId }) => { await requireAdmin(ctx); return ctx.db.query("gallerySyncState").withIndex("by_editionId", q => q.eq("editionId", editionId)).unique(); },
});
export const authorize = internalQuery({
  args: { editionId: v.id("editions") }, returns: v.string(),
  handler: async (ctx, { editionId }) => { const admin = await requireAdmin(ctx); if (!await ctx.db.get(editionId)) throw new Error("Edition missing"); return admin.authUserId; },
});
export const currentEdition = internalQuery({
  args: {}, returns: v.union(v.id("editions"), v.null()),
  handler: async ctx => (await ctx.db.query("editions").withIndex("by_current", q => q.eq("isCurrent", true)).unique())?._id ?? null,
});
export const acquire = internalMutation({
  args: { editionId: v.id("editions"), runId: v.string() }, returns: v.boolean(),
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gallerySyncState").withIndex("by_editionId", q => q.eq("editionId", args.editionId)).unique();
    if (state?.running && Date.now() - state.startedAt < 15 * 60_000) return false;
    const next = { ...args, running: true, startedAt: Date.now(), finishedAt: undefined, lastError: undefined, imported: 0, checked: 0 };
    if (state) await ctx.db.patch(state._id, next); else await ctx.db.insert("gallerySyncState", next);
    await ctx.scheduler.runAfter(0, internal.gallerySync.page, { ...args, phase: "incoming" });
    return true;
  },
});
export const active = internalQuery({
  args: { editionId: v.id("editions"), runId: v.string() }, returns: v.boolean(),
  handler: async (ctx, args) => { const state = await ctx.db.query("gallerySyncState").withIndex("by_editionId", q => q.eq("editionId", args.editionId)).unique(); return Boolean(state?.running && state.runId === args.runId); },
});
export const finish = internalMutation({
  args: { editionId: v.id("editions"), runId: v.string(), error: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gallerySyncState").withIndex("by_editionId", q => q.eq("editionId", args.editionId)).unique();
    if (state?.runId === args.runId) {
      await ctx.db.patch(state._id, { running: false, finishedAt: Date.now(), lastError: args.error });
      await ctx.db.insert("auditLogs", { editionId: args.editionId, actorAuthUserId: "system:drive-sync", action: args.error ? "gallery.syncFailed" : "gallery.syncCompleted", entityType: "edition", entityId: args.editionId, summary: args.error ?? `Imported ${state.imported}; checked ${state.checked}`, createdAt: Date.now() });
    }
    return null;
  },
});
export const upsertPage = internalMutation({
  args: { editionId: v.id("editions"), runId: v.string(), files: v.array(v.object({ id: v.string(), name: v.string(), md5Checksum: v.string(), createdAt: v.number(), inApproved: v.boolean() })) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gallerySyncState").withIndex("by_editionId", q => q.eq("editionId", args.editionId)).unique();
    if (!state?.running || state.runId !== args.runId) return null;
    let imported = 0;
    for (const file of args.files) {
      const item = await ctx.db.query("galleryItems").withIndex("by_driveFileId", q => q.eq("driveFileId", file.id)).first();
      if (item && item.editionId !== args.editionId) continue;
      if (item) {
        const previous = item.observedMd5Checksum ?? item.verifiedMd5Checksum ?? item.consentMd5Checksum;
        const changed = Boolean(previous && previous !== file.md5Checksum);
        const movedOut = item.approvalStatus === "approved" && !file.inApproved;
        await ctx.db.patch(item._id, {
          filename: file.name, source: item.source ?? "drive", availability: "present", lastSeenRunId: args.runId, observedMd5Checksum: file.md5Checksum,
          ...(changed || movedOut ? { consentConfirmed: false, consentMd5Checksum: undefined, verifiedMd5Checksum: undefined, approvalStatus: item.approvalStatus === "approved" ? "pending" as const : item.approvalStatus, reviewVersion: (item.reviewVersion ?? 0) + 1 } : {}),
        });
        if (changed) await ctx.db.insert("auditLogs", { editionId: args.editionId, actorAuthUserId: "system:drive-sync", action: "gallery.contentChanged", entityType: "galleryItem", entityId: item._id, summary: "Photo bytes changed; consent and publication verification withdrawn", createdAt: Date.now() });
        if (movedOut) await ctx.db.insert("auditLogs", { editionId: args.editionId, actorAuthUserId: "system:drive-sync", action: "gallery.movedOutOfApproved", entityType: "galleryItem", entityId: item._id, summary: "Photo moved out of Approved; publication withdrawn pending review", createdAt: Date.now() });
      } else {
        await ctx.db.insert("galleryItems", { editionId: args.editionId, driveFileId: file.id, source: "drive", filename: file.name, altText: file.name, observedMd5Checksum: file.md5Checksum, sortOrder: Date.now() + imported, approvalStatus: "pending", consentConfirmed: false, availability: "present", lastSeenRunId: args.runId, addedBy: "system:drive-sync", createdAt: file.createdAt, reviewVersion: 0 });
        imported++;
      }
    }
    await ctx.db.patch(state._id, { imported: state.imported + imported, checked: state.checked + args.files.length });
    return null;
  },
});
export const pageForReconcile = internalQuery({
  args: { editionId: v.id("editions"), paginationOpts: paginationOptsValidator }, returns: paginationResultValidator(schema.doc("galleryItems")),
  handler: (ctx, args) => ctx.db.query("galleryItems").withIndex("by_edition_sort", q => q.eq("editionId", args.editionId)).paginate(args.paginationOpts),
});
export const markUnavailable = internalMutation({
  args: { editionId: v.id("editions"), runId: v.string(), itemId: v.id("galleryItems"), expectedReviewVersion: v.number() }, returns: v.null(),
  handler: async (ctx, args) => {
    const state = await ctx.db.query("gallerySyncState").withIndex("by_editionId", q => q.eq("editionId", args.editionId)).unique();
    if (!state?.running || state.runId !== args.runId) return null;
    const item = await ctx.db.get(args.itemId);
    if (!item || item.lastSeenRunId === args.runId || (item.reviewVersion ?? 0) !== args.expectedReviewVersion || item.availability === "missing") return null;
    await ctx.db.patch(item._id, { availability: "missing", approvalStatus: item.approvalStatus === "approved" ? "pending" : item.approvalStatus, verifiedMd5Checksum: undefined, consentConfirmed: false, consentMd5Checksum: undefined, reviewVersion: (item.reviewVersion ?? 0) + 1 });
    await ctx.db.insert("auditLogs", { editionId: item.editionId, actorAuthUserId: "system:drive-sync", action: "gallery.unavailable", entityType: "galleryItem", entityId: item._id, summary: "File removed, trashed, unsupported or outside gallery folders; retained for review", createdAt: Date.now() });
    return null;
  },
});
