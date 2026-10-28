import { action, internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { ConvexError, v } from "convex/values";
import { driveFolders, driveMetadata, driveToken, DriveError, listDriveImages } from "../lib/drive-server";
import { isApprovedDriveImage } from "../lib/drive-validation";
import type { ActionCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

async function start(ctx: ActionCtx, editionId: Id<"editions">): Promise<boolean> {
  const runId = crypto.randomUUID();
  const acquired: boolean = await ctx.runMutation(internal.gallerySyncData.acquire, { editionId, runId });
  return acquired;
}
export const syncNow = action({
  args: { editionId: v.id("editions") }, returns: v.object({ started: v.boolean() }),
  handler: async (ctx, { editionId }): Promise<{ started: boolean }> => {
    await ctx.runQuery(internal.gallerySyncData.authorize, { editionId });
    try { driveFolders(); return { started: await start(ctx, editionId) }; }
    catch (error) { throw new ConvexError(error instanceof Error ? error.message : "Unable to start sync"); }
  },
});
export const poll = internalAction({
  args: {}, returns: v.null(),
  handler: async ctx => { const editionId = await ctx.runQuery(internal.gallerySyncData.currentEdition, {}); if (editionId) await start(ctx, editionId); return null; },
});
export const page = internalAction({
  args: { editionId: v.id("editions"), runId: v.string(), phase: v.union(v.literal("incoming"), v.literal("approved"), v.literal("reconcile")), cursor: v.optional(v.string()) }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    if (!await ctx.runQuery(internal.gallerySyncData.active, { editionId: args.editionId, runId: args.runId })) return null;
    try {
      const folders = driveFolders(), token = await driveToken();
      // Validate folder access before listing: an empty inaccessible folder is not a successful scan.
      if (args.phase !== "reconcile") {
        const folder = args.phase === "incoming" ? folders.incoming : folders.approved;
        const metadata = await driveMetadata(token, folder, true);
        if (metadata.trashed || metadata.mimeType !== "application/vnd.google-apps.folder") throw new DriveError("Configured Drive folder is not an accessible folder.");
        const result = await listDriveImages(token, folder, args.cursor);
        const files = result.files.filter(file => file.id && file.md5Checksum && isApprovedDriveImage(file, folder)).map(file => ({ id: file.id!, name: (file.name ?? "Photo").slice(0, 500), md5Checksum: file.md5Checksum!, createdAt: Number.isFinite(Date.parse(file.createdTime ?? "")) ? Date.parse(file.createdTime!) : Date.now(), inApproved: Boolean(file.parents?.includes(folders.approved)) }));
        await ctx.runMutation(internal.gallerySyncData.upsertPage, { editionId: args.editionId, runId: args.runId, files });
        console.info("gallery.sync_page", { runId: args.runId, phase: args.phase, checked: result.files.length, valid: files.length });
        if (result.nextPageToken) await ctx.scheduler.runAfter(0, internal.gallerySync.page, { ...args, cursor: result.nextPageToken });
        else await ctx.scheduler.runAfter(0, internal.gallerySync.page, { editionId: args.editionId, runId: args.runId, phase: args.phase === "incoming" && folders.incoming !== folders.approved ? "approved" : "reconcile" });
      } else {
        const result = await ctx.runQuery(internal.gallerySyncData.pageForReconcile, { editionId: args.editionId, paginationOpts: { numItems: 25, cursor: args.cursor ?? null } });
        for (const item of result.page) {
          if (item.lastSeenRunId === args.runId) continue;
          let file;
          try { file = await driveMetadata(token, item.driveFileId); }
          catch (error) { if (!(error instanceof DriveError) || error.status !== 404) throw error; }
          if (file?.md5Checksum && (isApprovedDriveImage(file, folders.incoming) || isApprovedDriveImage(file, folders.approved))) {
            await ctx.runMutation(internal.gallerySyncData.upsertPage, { editionId: args.editionId, runId: args.runId, files: [{ id: item.driveFileId, name: (file.name ?? item.filename ?? item.altText).slice(0, 500), md5Checksum: file.md5Checksum, createdAt: item.createdAt, inApproved: Boolean(file.parents?.includes(folders.approved)) }] });
          } else {
            await ctx.runMutation(internal.gallerySyncData.markUnavailable, { editionId: args.editionId, runId: args.runId, itemId: item._id, expectedReviewVersion: item.reviewVersion ?? 0 });
          }
        }
        if (!result.isDone) await ctx.scheduler.runAfter(0, internal.gallerySync.page, { ...args, cursor: result.continueCursor });
        else { await ctx.runMutation(internal.gallerySyncData.finish, { editionId: args.editionId, runId: args.runId }); console.info("gallery.sync_completed", { runId: args.runId }); }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Drive synchronization failed";
      console.error("gallery.sync_failed", { runId: args.runId, phase: args.phase, message });
      await ctx.runMutation(internal.gallerySyncData.finish, { editionId: args.editionId, runId: args.runId, error: message });
    }
    return null;
  },
});
