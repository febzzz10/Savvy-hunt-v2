import {query,mutation,action,internalQuery,internalMutation} from "./_generated/server";import {internal} from "./_generated/api";import {v} from "convex/values";import {requireAdmin,requiredText} from "./lib/security";
import { isApprovedDriveImage } from "../lib/drive-validation";
import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import schema from "./schema";
import { ConvexError } from "convex/values";
import { driveFolders, driveToken, driveMetadata } from "../lib/drive-server";
const published = (item: import("./_generated/dataModel").Doc<"galleryItems">) => item.approvalStatus === "approved" && item.consentConfirmed && Boolean(item.verifiedMd5Checksum) && item.availability !== "missing";
export const getForApproval = internalQuery({
  args: { itemId: v.id("galleryItems"), actorAuthUserId: v.string() }, returns: schema.doc("galleryItems"),
  handler: async (ctx, args) => {
    const admin = await ctx.db.query("admins").withIndex("by_auth_user_id", q => q.eq("authUserId", args.actorAuthUserId)).unique();
    if (!admin?.isActive) throw new Error("FORBIDDEN");
    const item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Gallery item missing");
    return item;
  },
});
export const publishVerified = internalMutation({
  args: { itemId: v.id("galleryItems"), actorAuthUserId: v.string(), expectedDriveFileId: v.string(), expectedReviewVersion: v.number(), verifiedMd5Checksum: v.string(), filename: v.string(), consentConfirmed: v.boolean() }, returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await ctx.db.query("admins").withIndex("by_auth_user_id", q => q.eq("authUserId", args.actorAuthUserId)).unique();
    if (!admin?.isActive) throw new Error("FORBIDDEN");
    if (!args.consentConfirmed) throw new ConvexError("Photo consent confirmation required");
    const item = await ctx.db.get(args.itemId);
    if (!item || item.driveFileId !== args.expectedDriveFileId || (item.reviewVersion ?? 0) !== args.expectedReviewVersion) throw new ConvexError("Gallery item changed during verification. Review the photo and try again.");
    const duplicates = await ctx.db.query("galleryItems").withIndex("by_driveFileId_and_approvalStatus", q => q.eq("driveFileId", item.driveFileId).eq("approvalStatus", "approved")).take(2);
    if (duplicates.some(duplicate => duplicate._id !== item._id)) throw new ConvexError("This Drive file already has an approved gallery entry. Review the original entry.");
    const now = Date.now();
    await ctx.db.patch(item._id, { approvalStatus: "approved", consentConfirmed: true, consentMd5Checksum: args.verifiedMd5Checksum, consentConfirmedBy: admin.authUserId, consentConfirmedAt: now, verifiedMd5Checksum: args.verifiedMd5Checksum, observedMd5Checksum: args.verifiedMd5Checksum, availability: "present", filename: args.filename, approvedBy: admin.authUserId, approvedAt: now, reviewVersion: (item.reviewVersion ?? 0) + 1 });
    await ctx.db.insert("auditLogs", { editionId: item.editionId, actorAuthUserId: admin.authUserId, action: "gallery.approve", entityType: "galleryItem", entityId: item._id, summary: "Explicit publication consent confirmed; Drive bytes verified", createdAt: now });
    console.info("gallery.approved", { itemId: item._id, actor: admin.authUserId });
    return null;
  },
});
export const approve = action({
  args: { itemId: v.id("galleryItems"), consentConfirmed: v.boolean(), expectedMd5Checksum: v.optional(v.string()), expectedReviewVersion: v.optional(v.number()) }, returns: v.object({ status: v.literal("approved") }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED");
    const item = await ctx.runQuery(internal.gallery.getForApproval, { itemId: args.itemId, actorAuthUserId: identity.tokenIdentifier });
    if (!args.consentConfirmed) throw new ConvexError("Photo consent confirmation required. Confirm permission to publish this photo before approving.");
    try {
      const { approved } = driveFolders();
      if (!args.expectedMd5Checksum || args.expectedReviewVersion === undefined) throw new ConvexError("Sync this photo and review its current preview before approving.");
      if ((item.reviewVersion ?? 0) !== args.expectedReviewVersion) throw new ConvexError("This photo's review changed. Review its current preview before approving.");
      const token = await driveToken();
      const original = await driveMetadata(token, item.driveFileId);
      if (original.md5Checksum !== args.expectedMd5Checksum) throw new ConvexError("This photo's content changed after review. Sync and review the new photo before confirming consent.");
      if (!isApprovedDriveImage(original, approved)) throw new ConvexError("Photo must be a supported image under 15 MB in the GOOGLE_DRIVE_FOLDER_ID gallery folder. If using a separate Incoming folder, move the photo into the gallery folder manually in Google Drive, then sync and review again.");
      const verified = original;
      if (!isApprovedDriveImage(verified, approved) || !verified.md5Checksum || verified.md5Checksum !== original.md5Checksum) throw new Error("Photo changed during approval or is unavailable in the approved folder. Review and try again.");
      await ctx.runMutation(internal.gallery.publishVerified, { itemId: item._id, actorAuthUserId: identity.tokenIdentifier, expectedDriveFileId: item.driveFileId, expectedReviewVersion: item.reviewVersion ?? 0, verifiedMd5Checksum: verified.md5Checksum, filename: (verified.name ?? item.filename ?? item.altText).slice(0, 500), consentConfirmed: true });
      return { status: "approved" as const };
    } catch (error) {
      console.warn("gallery.approval_failed", { itemId: args.itemId, message: error instanceof Error ? error.message : "Approval failed" });
      throw new ConvexError(error instanceof Error ? error.message : "Photo approval failed");
    }
  },
});
export const reject = mutation({
  args: { itemId: v.id("galleryItems"), reason: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx), item = await ctx.db.get(args.itemId);
    if (!item) throw new Error("Gallery item missing");
    const reason = requiredText(args.reason, "Rejection reason");
    if (reason.length > 2000) throw new ConvexError("Rejection reason is too long");
    const now = Date.now();
    await ctx.db.patch(item._id, { approvalStatus: "rejected", rejectedBy: admin.authUserId, rejectedAt: now, rejectionReason: reason, reviewVersion: (item.reviewVersion ?? 0) + 1 });
    await ctx.db.insert("auditLogs", { editionId: item.editionId, actorAuthUserId: admin.authUserId, action: "gallery.reject", entityType: "galleryItem", entityId: item._id, summary: reason, createdAt: now });
    return null;
  },
});
const publicPhoto = v.object({_id:v.id("galleryItems"),title:v.optional(v.string()),caption:v.optional(v.string()),altText:v.string()});
export const pageApproved=query({args:{editionId:v.id("editions"),paginationOpts:paginationOptsValidator},returns:paginationResultValidator(publicPhoto),handler:async(ctx,args)=>{const result=await ctx.db.query("galleryItems").withIndex("by_edition_status_sort",q=>q.eq("editionId",args.editionId).eq("approvalStatus","approved")).paginate(args.paginationOpts);return {...result,page:result.page.filter(item=>published(item)).map(item=>({_id:item._id,title:item.title,caption:item.caption,altText:item.altText}))}}});
export const pageAdmin=query({args:{editionId:v.id("editions"),view:v.optional(v.union(v.literal("pending"),v.literal("approved"),v.literal("rejected"))),paginationOpts:paginationOptsValidator},returns:paginationResultValidator(schema.doc("galleryItems")),handler:async(ctx,args)=>{await requireAdmin(ctx);const result=await ctx.db.query("galleryItems").withIndex("by_edition_sort",q=>q.eq("editionId",args.editionId)).paginate(args.paginationOpts);return {...result,page:result.page.filter(item=>!args.view||(item.approvalStatus==="draft"?"pending":item.approvalStatus==="hidden"?"rejected":item.approvalStatus)===args.view)}}});
export const updateMetadata=mutation({args:{itemId:v.id("galleryItems"),altText:v.string(),caption:v.string()},returns:v.null(),handler:async(ctx,args)=>{const admin=await requireAdmin(ctx),item=await ctx.db.get(args.itemId);if(!item)throw new Error("Gallery item missing");const altText=requiredText(args.altText,"Alt text");if(altText.length>500||args.caption.length>2000)throw new Error("Gallery text is too long");await ctx.db.patch(item._id,{altText,caption:args.caption.trim()});await ctx.db.insert("auditLogs",{editionId:item.editionId,actorAuthUserId:admin.authUserId,action:"gallery.updateMetadata",entityType:"galleryItem",entityId:item._id,summary:"Gallery description updated",createdAt:Date.now()});return null}});
export const move=mutation({args:{itemId:v.id("galleryItems"),direction:v.union(v.literal("earlier"),v.literal("later"))},returns:v.null(),handler:async(ctx,args)=>{const admin=await requireAdmin(ctx),item=await ctx.db.get(args.itemId);if(!item)throw new Error("Gallery item missing");const adjacent=args.direction==="earlier"?await ctx.db.query("galleryItems").withIndex("by_edition_sort",q=>q.eq("editionId",item.editionId).lt("sortOrder",item.sortOrder)).order("desc").first():await ctx.db.query("galleryItems").withIndex("by_edition_sort",q=>q.eq("editionId",item.editionId).gt("sortOrder",item.sortOrder)).first();if(!adjacent)return null;await ctx.db.patch(item._id,{sortOrder:adjacent.sortOrder});await ctx.db.patch(adjacent._id,{sortOrder:item.sortOrder});await ctx.db.insert("auditLogs",{editionId:item.editionId,actorAuthUserId:admin.authUserId,action:"gallery.reorder",entityType:"galleryItem",entityId:item._id,summary:`Moved ${args.direction}`,createdAt:Date.now()});return null}});
export const listApproved=query({args:{editionId:v.id("editions")},returns:v.array(publicPhoto),handler:async(ctx,{editionId})=>(await ctx.db.query("galleryItems").withIndex("by_edition_status_sort",q=>q.eq("editionId",editionId).eq("approvalStatus","approved")).take(12)).filter(x=>published(x)).map(x=>({_id:x._id,title:x.title,caption:x.caption,altText:x.altText}))});
export const getApprovedItem=query({args:{itemId:v.id("galleryItems"),proxySecret:v.string()},returns:v.union(v.object({driveFileId:v.string(),verifiedMd5Checksum:v.string()}),v.null()),handler:async(ctx,{itemId,proxySecret})=>{if(!process.env.GALLERY_PROXY_SECRET||proxySecret!==process.env.GALLERY_PROXY_SECRET)throw new Error("FORBIDDEN");const item=await ctx.db.get(itemId);return item&&published(item)?{driveFileId:item.driveFileId,verifiedMd5Checksum:item.verifiedMd5Checksum!}:null}});
export const getPreviewItem=query({args:{itemId:v.id("galleryItems")},returns:v.union(v.object({driveFileId:v.string(),verifiedMd5Checksum:v.string()}),v.null()),handler:async(ctx,{itemId})=>{await requireAdmin(ctx);const item=await ctx.db.get(itemId);const checksum=item?.observedMd5Checksum??item?.verifiedMd5Checksum??item?.consentMd5Checksum;return item&&checksum?{driveFileId:item.driveFileId,verifiedMd5Checksum:checksum}:null}});
export const add=mutation({args:{editionId:v.id("editions"),driveFileId:v.string(),altText:v.string(),caption:v.optional(v.string())},handler:async(ctx,args)=>{const admin=await requireAdmin(ctx);const id=requiredText(args.driveFileId,"Drive file ID");if(!await ctx.db.get(args.editionId))throw new Error("Edition missing");if(!/^[A-Za-z0-9_-]{20,100}$/.test(id))throw new Error("Invalid Drive file ID");const existing=await ctx.db.query("galleryItems").withIndex("by_driveFileId",q=>q.eq("driveFileId",id)).first();if(existing)throw new Error("Drive file is already registered");const now=Date.now();const last=await ctx.db.query("galleryItems").withIndex("by_edition_sort",q=>q.eq("editionId",args.editionId)).order("desc").first();const itemId=await ctx.db.insert("galleryItems",{editionId:args.editionId,driveFileId:id,altText:requiredText(args.altText,"Alt text"),caption:args.caption?.trim(),sortOrder:Math.max(now,(last?.sortOrder??0)+1),approvalStatus:"pending",source:"drive",consentConfirmed:false,addedBy:admin.authUserId,createdAt:now});await ctx.db.insert("auditLogs",{editionId:args.editionId,actorAuthUserId:admin.authUserId,action:"gallery.add",entityType:"galleryItem",entityId:itemId,summary:"Gallery draft added",createdAt:now});return itemId}});
export const hide=mutation({args:{itemId:v.id("galleryItems")},handler:async(ctx,{itemId})=>{const admin=await requireAdmin(ctx),item=await ctx.db.get(itemId);if(!item)throw new Error("Gallery item missing");await ctx.db.patch(item._id,{approvalStatus:"hidden",reviewVersion:(item.reviewVersion??0)+1});await ctx.db.insert("auditLogs",{editionId:item.editionId,actorAuthUserId:admin.authUserId,action:"gallery.hide",entityType:"galleryItem",entityId:item._id,summary:item.altText,createdAt:Date.now()})}});
