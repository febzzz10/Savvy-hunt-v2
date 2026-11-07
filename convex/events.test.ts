/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

async function setup() {
  const t = convexTest(schema, import.meta.glob("./**/*.ts"));
  await t.run(ctx => ctx.db.insert("admins", { authUserId: "test|events", displayName: "Organizer", role: "super_admin", isActive: true, createdAt: 1, updatedAt: 1 }));
  const admin = t.withIdentity({ tokenIdentifier: "test|events", subject: "events" });
  const editionId = await admin.mutation(api.editions.initialize, { name: "Event category tests", year: 2026 });
  const categories = await admin.query(api.categories.listCurrent, { editionId });
  const schoolId = await admin.mutation(api.schools.save, { editionId, name: "Test school" });
  const input = { editionId, categoryId: categories[0]._id, title: "Category test event", startsAt: 1800000000000 };
  const eventId = await admin.mutation(api.events.save, input);
  async function event() { return (await admin.query(api.events.listAdmin, { editionId })).find(row => row._id === eventId)!; }
  async function draft(points = 7, reason?: string) {
    const data = await admin.query(api.results.getAdminByEvent, { eventId });
    return admin.mutation(api.results.saveDraft, { eventId, entries: [{ schoolId, placement: 1, points }], reason, expectedDraftVersion: data.draft?.draftVersion });
  }
  async function publish(points = 7, reason?: string) {
    const draftRevisionId = await draft(points, reason);
    const preview = await admin.query(api.results.preview, { eventId, draftRevisionId });
    await admin.mutation(api.results.publish, { eventId, draftRevisionId, expectedActiveRevisionId: preview.expectedActiveRevisionId, expectedDraftVersion: preview.expectedDraftVersion });
    return draftRevisionId;
  }
  return { t, admin, editionId, categories, schoolId, input, eventId, event, draft, publish };
}

describe("event category and publication history", () => {
  it("creates an unpublished event with its exact category and edits details without changing it", async () => {
    const s = await setup();
    expect(await s.event()).toMatchObject({ categoryId: s.input.categoryId, hasPublicationHistory: false, publicationState: "unpublished", hasDraftResults: false });
    await s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, venue: "New venue" });
    expect(await s.event()).toMatchObject({ categoryId: s.input.categoryId, venue: "New venue" });
  });

  it("allows a category change before any official publication, including with draft results", async () => {
    const s = await setup();
    await s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, categoryId: s.categories[1]._id });
    const revision = await s.draft();
    expect(await s.event()).toMatchObject({ hasPublicationHistory: false, publicationState: "draft", hasDraftResults: true });
    await s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, categoryId: s.categories[2]._id, description: "Draft event updated" });
    expect(await s.event()).toMatchObject({ categoryId: s.categories[2]._id, description: "Draft event updated" });
    expect((await s.admin.query(api.results.getAdminByEvent, { eventId: s.eventId })).draft?._id).toBe(revision);
    await s.publish();
    expect((await s.t.query(api.scoreboard.getCategory, { editionId: s.editionId, categoryId: s.categories[2]._id }))[0].points).toBe(7);
    expect((await s.t.query(api.scoreboard.getCategory, { editionId: s.editionId, categoryId: s.categories[0]._id }))[0].points).toBe(0);
  });

  it("rejects category changes after publication while allowing other details and preserving totals/history", async () => {
    const s = await setup();
    await s.publish();
    expect(await s.event()).toMatchObject({ hasPublicationHistory: true, publicationState: "published" });
    const before = await s.admin.query(api.results.getAdminByEvent, { eventId: s.eventId });
    await expect(s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, categoryId: s.categories[1]._id })).rejects.toThrow(/category.*publication|category.*previously published/i);
    await s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, venue: "Main hall", description: "Revised details", status: "completed", participatingSchoolIds: [s.schoolId] });
    const after = await s.admin.query(api.results.getAdminByEvent, { eventId: s.eventId });
    expect(after.revisions).toEqual(before.revisions);
    expect(after.officialEntries).toEqual(before.officialEntries);
    expect(await s.event()).toMatchObject({ categoryId: s.input.categoryId, venue: "Main hall", status: "completed" });
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId }))[0].points).toBe(7);
    expect((await s.t.query(api.scoreboard.getCategory, { editionId: s.editionId, categoryId: s.input.categoryId }))[0].points).toBe(7);
  });

  it("identifies revoked events, retains the category lock and allows editing permitted details", async () => {
    const s = await setup();
    const revision = await s.publish();
    await s.admin.mutation(api.results.revoke, { eventId: s.eventId, reason: "Withdrawn", expectedActiveRevisionId: revision });
    expect(await s.event()).toMatchObject({ resultStatus: "none", hasPublicationHistory: true, publicationState: "revoked", hasDraftResults: false });
    await expect(s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, categoryId: s.categories[1]._id })).rejects.toThrow(/category.*publication|category.*previously published/i);
    await s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, venue: "Changed after revocation" });
    expect((await s.admin.query(api.results.getAdminByEvent, { eventId: s.eventId })).revisions[0]).toMatchObject({ _id: revision, status: "revoked" });
    await s.draft(9);
    expect(await s.event()).toMatchObject({ publicationState: "revoked", hasPublicationHistory: true, hasDraftResults: true });
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId }))[0].points).toBe(0);
    expect((await s.admin.query(api.admins.listAudit, {})).some(row => row.action === "results.revoke")).toBe(true);
  });

  it("locks categories for superseded history even when no active revision remains", async () => {
    const s = await setup();
    await s.publish();
    const corrected = await s.publish(9, "Judge correction");
    await s.admin.mutation(api.results.revoke, { eventId: s.eventId, reason: "Withdrawn", expectedActiveRevisionId: corrected });
    expect((await s.admin.query(api.results.getAdminByEvent, { eventId: s.eventId })).revisions.map(row => row.status).sort()).toEqual(["revoked", "superseded"]);
    await expect(s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, categoryId: s.categories[1]._id })).rejects.toThrow(/category.*publication|category.*previously published/i);
    expect(await s.event()).toMatchObject({ hasPublicationHistory: true, publicationState: "revoked" });
  });

  it.each(["published", "superseded", "revoked"] as const)("recognizes %s history independently of an active publication pointer", async status => {
    const s = await setup();
    const revisionId = await s.t.run(ctx => ctx.db.insert("resultRevisions", { eventId: s.eventId, revisionNumber: 1, status, createdBy: "test|events", createdAt: 1, publishedBy: "test|events", publishedAt: 1 }));
    expect(await s.event()).toMatchObject({ hasPublicationHistory: true, publicationState: "revoked" });
    await expect(s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, categoryId: s.categories[1]._id })).rejects.toThrow(/category.*publication|category.*previously published/i);
    expect((await s.admin.query(api.results.getAdminByEvent, { eventId: s.eventId })).revisions[0]).toMatchObject({ _id: revisionId, status });
  });

  it("preserves the original category label and allows other edits if that category is inactive", async () => {
    const s = await setup();
    await s.publish();
    await s.t.run(ctx => ctx.db.patch(s.input.categoryId, { isActive: false }));
    expect(await s.event()).toMatchObject({ categoryName: s.categories[0].name });
    await s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, venue: "Updated venue" });
    await expect(s.admin.mutation(api.events.save, { ...s.input, title: "New event in inactive category" })).rejects.toThrow("Invalid category");
  });

  it("rejects stale saves instead of reverting a category changed by another organizer", async () => {
    const s = await setup();
    const original = await s.event();
    await s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, categoryId: s.categories[1]._id });
    await expect(s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, venue: "Stale venue", expectedCategoryId: original.categoryId, expectedUpdatedAt: original.updatedAt })).rejects.toThrow("STALE_EVENT");
    expect((await s.event()).categoryId).toBe(s.categories[1]._id);
  });
});

describe("event deletion", () => {
  it("deletes an unpublished event with its draft while keeping audit history and other events", async () => {
    const s = await setup();
    const revision = await s.draft(7);
    const otherId = await s.admin.mutation(api.events.save, { ...s.input, title: "Untouched event" });
    const target = await s.event();
    await s.admin.mutation(api.events.remove, { eventId: s.eventId, expectedUpdatedAt: target.updatedAt });
    expect(await s.t.run(ctx => ctx.db.get(s.eventId))).toBeNull();
    expect(await s.t.run(ctx => ctx.db.get(revision))).toBeNull();
    expect(await s.t.run(ctx => ctx.db.query("resultEntries").withIndex("by_revision", q => q.eq("revisionId", revision)).collect())).toEqual([]);
    expect(await s.t.run(ctx => ctx.db.get(otherId))).not.toBeNull();
    expect((await s.admin.query(api.admins.listAudit, {})).some(row => row.action === "event.delete" && row.entityId === s.eventId)).toBe(true);
  });

  it("allows an active editor to delete an unpublished event", async () => {
    const s = await setup();
    const editor = s.t.withIdentity({ subject: "editor-delete", tokenIdentifier: "test|editor-delete" });
    await s.t.run(ctx => ctx.db.insert("admins", { authUserId: "test|editor-delete", displayName: "Editor", role: "editor", isActive: true, createdAt: 1, updatedAt: 1 }));
    await editor.mutation(api.events.remove, { eventId: s.eventId, expectedUpdatedAt: (await s.event()).updatedAt });
    expect(await s.t.run(ctx => ctx.db.get(s.eventId))).toBeNull();
  });

  it("rejects deletion by unauthenticated users and non-admins", async () => {
    const s = await setup();
    const regular = s.t.withIdentity({ subject: "regular-delete", tokenIdentifier: "test|regular-delete" });
    const target = await s.event();
    await expect(regular.mutation(api.events.remove, { eventId: s.eventId, expectedUpdatedAt: target.updatedAt })).rejects.toThrow("FORBIDDEN");
    await expect(s.t.mutation(api.events.remove, { eventId: s.eventId, expectedUpdatedAt: target.updatedAt })).rejects.toThrow("UNAUTHENTICATED");
    expect(await s.t.run(ctx => ctx.db.get(s.eventId))).not.toBeNull();
  });

  it("refuses published and withdrawn events without touching the scoreboard or history", async () => {
    const s = await setup();
    const revision = await s.publish();
    let target = await s.event();
    await expect(s.admin.mutation(api.events.remove, { eventId: s.eventId, expectedUpdatedAt: target.updatedAt })).rejects.toThrow(/publication history/i);
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId }))[0].points).toBe(7);
    expect(await s.t.run(ctx => ctx.db.get(revision))).not.toBeNull();
    await s.admin.mutation(api.results.revoke, { eventId: s.eventId, reason: "Withdrawn", expectedActiveRevisionId: revision });
    target = await s.event();
    await expect(s.admin.mutation(api.events.remove, { eventId: s.eventId, expectedUpdatedAt: target.updatedAt })).rejects.toThrow(/publication history/i);
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId }))[0].points).toBe(0);
    expect(await s.t.run(ctx => ctx.db.get(s.eventId))).not.toBeNull();
  });

  it("rejects a stale delete instead of removing an event edited elsewhere", async () => {
    const s = await setup();
    const stale = await s.event();
    await s.admin.mutation(api.events.save, { ...s.input, id: s.eventId, venue: "Changed venue" });
    await expect(s.admin.mutation(api.events.remove, { eventId: s.eventId, expectedUpdatedAt: stale.updatedAt - 1 })).rejects.toThrow("STALE_EVENT");
    expect(await s.event()).toMatchObject({ venue: "Changed venue" });
  });
});
