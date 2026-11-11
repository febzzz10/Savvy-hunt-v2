import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireAdmin } from "./lib/security";

const approvalStatus = v.union(v.literal("draft"), v.literal("pending"), v.literal("approved"), v.literal("hidden"), v.literal("rejected"));
export const gallerySummary = query({
  args: { editionId: v.id("editions") },
  returns: v.object({
    total: v.number(),
    pending: v.number(),
    recent: v.array(v.object({
      _id: v.id("galleryItems"), altText: v.string(), filename: v.optional(v.string()), approvalStatus,
      availability: v.optional(v.union(v.literal("present"), v.literal("missing"))), createdAt: v.number(), previewable: v.boolean(),
    })),
  }),
  handler: async (ctx, { editionId }) => {
    await requireAdmin(ctx);
    const items = await ctx.db.query("galleryItems").withIndex("by_edition_sort", q => q.eq("editionId", editionId)).collect();
    const recent = items.sort((a, b) => b.createdAt - a.createdAt || b._creationTime - a._creationTime).slice(0, 5);
    return {
      total: items.length,
      pending: items.filter(item => item.approvalStatus === "draft" || item.approvalStatus === "pending").length,
      recent: recent.map(item => ({
        _id: item._id, altText: item.altText, filename: item.filename, approvalStatus: item.approvalStatus as "draft" | "pending" | "approved" | "hidden" | "rejected",
        availability: item.availability, createdAt: item.createdAt,
        previewable: Boolean(item.observedMd5Checksum || item.verifiedMd5Checksum || item.consentMd5Checksum),
      })),
    };
  },
});
