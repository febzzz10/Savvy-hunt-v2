import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import schema from "./schema";
import type { Doc } from "./_generated/dataModel";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireAdmin, requiredText, slugify } from "./lib/security";
const eventStatus=v.union(v.literal("upcoming"),v.literal("live"),v.literal("completed"),v.literal("postponed"),v.literal("cancelled"));
const publicEvent=(event:{_id:unknown;title:string;slug:string;description?:string;venue?:string;startsAt:number;endsAt?:number;status:string;categoryId:unknown;activePublishedRevisionId?:unknown})=>({_id:event._id,title:event.title,slug:event.slug,description:event.description,venue:event.venue,startsAt:event.startsAt,endsAt:event.endsAt,status:event.status,categoryId:event.categoryId,hasPublishedResults:Boolean(event.activePublishedRevisionId)});
export const listPublic=query({args:{editionId:v.id("editions")},handler:async(ctx,{editionId})=>(await ctx.db.query("events").withIndex("by_edition_start",q=>q.eq("editionId",editionId)).collect()).map(publicEvent)});
export const getPublicBySlug=query({args:{editionId:v.id("editions"),slug:v.string()},handler:async(ctx,args)=>{const event=await ctx.db.query("events").withIndex("by_edition_slug",q=>q.eq("editionId",args.editionId).eq("slug",args.slug)).unique();return event?publicEvent(event):null}});

// Revoking removes the active pointer, but never removes the publication history.
async function hasPublicationHistory(ctx: QueryCtx | MutationCtx, event: Doc<"events">) {
  if (event.activePublishedRevisionId) return true;
  for (const status of ["published", "superseded", "revoked"] as const) {
    const revision = await ctx.db.query("resultRevisions")
      .withIndex("by_event_status", q => q.eq("eventId", event._id).eq("status", status)).first();
    if (revision) return true;
  }
  return false;
}

export const listAdmin = query({
  args: { editionId: v.id("editions") },
  returns: v.array(schema.doc("events").extend({
    hasPublicationHistory: v.boolean(), hasDraftResults: v.boolean(), categoryName: v.string(),
    publicationState: v.union(v.literal("unpublished"), v.literal("draft"), v.literal("published"), v.literal("revoked")),
  })),
  handler: async (ctx, { editionId }) => {
    await requireAdmin(ctx);
    const events = await ctx.db.query("events").withIndex("by_edition_start", q => q.eq("editionId", editionId)).collect();
    return Promise.all(events.map(async event => {
      const history = await hasPublicationHistory(ctx, event);
      const draft = await ctx.db.query("resultRevisions").withIndex("by_event_status", q => q.eq("eventId", event._id).eq("status", "draft")).first();
      const category = await ctx.db.get(event.categoryId);
      const publicationState = event.activePublishedRevisionId ? "published" as const : history ? "revoked" as const : draft ? "draft" as const : "unpublished" as const;
      return { ...event, hasPublicationHistory: history, hasDraftResults: Boolean(draft), categoryName: category?.name ?? "Archived category", publicationState };
    }));
  },
});

export const save = mutation({
  args: {
    editionId: v.id("editions"), id: v.optional(v.id("events")), categoryId: v.id("categories"),
    expectedCategoryId: v.optional(v.id("categories")), expectedUpdatedAt: v.optional(v.number()),
    participatingSchoolIds: v.optional(v.array(v.id("schools"))), title: v.string(), startsAt: v.number(),
    endsAt: v.optional(v.number()), venue: v.optional(v.string()), description: v.optional(v.string()), status: v.optional(eventStatus),
  },
  returns: v.id("events"),
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const old = args.id ? await ctx.db.get(args.id) : null;
    if (args.id && (!old || old.editionId !== args.editionId)) throw new Error("Event missing");
    if (old && ((args.expectedCategoryId !== undefined && args.expectedCategoryId !== old.categoryId) || (args.expectedUpdatedAt !== undefined && args.expectedUpdatedAt !== old.updatedAt))) {
      throw new ConvexError("STALE_EVENT");
    }
    if (old && old.categoryId !== args.categoryId && await hasPublicationHistory(ctx, old)) {
      // Keep the existing invariant for published, superseded AND revoked revisions.
      throw new ConvexError("Cannot change category after publication. Official results were previously published. Keep the original category or create a new event.");
    }
    const title = requiredText(args.title, "Event title"), slug = slugify(title), now = Date.now();
    if (title.length > 160 || args.venue && args.venue.length > 200 || args.description && args.description.length > 4000) throw new Error("Event information is too long");
    const category = await ctx.db.get(args.categoryId);
    // An inactive original category may be retained when editing other details.
    if (!category || category.editionId !== args.editionId || (!category.isActive && old?.categoryId !== args.categoryId)) throw new Error("Invalid category");
    if (!Number.isFinite(args.startsAt) || args.endsAt !== undefined && (!Number.isFinite(args.endsAt) || args.endsAt < args.startsAt)) throw new Error("Invalid schedule");
    if (args.participatingSchoolIds) {
      if (new Set(args.participatingSchoolIds).size !== args.participatingSchoolIds.length) throw new Error("Duplicate participating school");
      for (const schoolId of args.participatingSchoolIds) {
        const school = await ctx.db.get(schoolId);
        if (!school || school.editionId !== args.editionId || school.status !== "active") throw new Error("Invalid participating school");
      }
    }
    const duplicate = await ctx.db.query("events").withIndex("by_edition_slug", q => q.eq("editionId", args.editionId).eq("slug", slug)).unique();
    if (duplicate && duplicate._id !== args.id) throw new Error("Event title already exists");
    let id = args.id;
    if (id && old) {
      if (old.activePublishedRevisionId && args.participatingSchoolIds) {
        const entries = await ctx.db.query("resultEntries").withIndex("by_revision", q => q.eq("revisionId", old.activePublishedRevisionId!)).collect();
        if (entries.some(entry => !args.participatingSchoolIds!.includes(entry.schoolId))) throw new Error("Cannot remove a school from published results");
      }
      await ctx.db.patch(id, { categoryId: args.categoryId, participatingSchoolIds: args.participatingSchoolIds ?? old.participatingSchoolIds, title, slug, startsAt: args.startsAt, endsAt: args.endsAt, venue: args.venue?.trim(), description: args.description?.trim(), status: args.status ?? old.status, updatedAt: now });
    } else {
      id = await ctx.db.insert("events", { editionId: args.editionId, categoryId: args.categoryId, participatingSchoolIds: args.participatingSchoolIds, title, slug, startsAt: args.startsAt, endsAt: args.endsAt, venue: args.venue?.trim(), description: args.description?.trim(), status: args.status ?? "upcoming", resultStatus: "none", isFeatured: false, createdBy: admin.authUserId, createdAt: now, updatedAt: now });
    }
    await ctx.db.insert("auditLogs", { editionId: args.editionId, actorAuthUserId: admin.authUserId, action: args.id ? "event.update" : "event.create", entityType: "event", entityId: id, summary: title, createdAt: now });
    return id;
  },
});
