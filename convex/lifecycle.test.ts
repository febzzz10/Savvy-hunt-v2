/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");
async function setup() {
  const t = convexTest(schema, modules);
  const superAdmin = t.withIdentity({ subject: "super", tokenIdentifier: "test|super" });
  const editor = t.withIdentity({ subject: "editor", tokenIdentifier: "test|editor" });
  const regular = t.withIdentity({ subject: "regular", tokenIdentifier: "test|regular" });
  const revoked = t.withIdentity({ subject: "revoked", tokenIdentifier: "test|revoked" });
  await t.run(async ctx => {
    for (const [name, role, isActive] of [["super", "super_admin", true], ["editor", "editor", true], ["revoked", "super_admin", false]] as const) {
      await ctx.db.insert("admins", { authUserId: `test|${name}`, displayName: name, role, isActive, createdAt: 1, updatedAt: 1 });
    }
  });
  const editionId = await superAdmin.mutation(api.editions.initialize, { name: "Verification edition", year: 2026 });
  const categories = await t.query(api.categories.listCurrent, { editionId });
  const a = await editor.mutation(api.schools.save, { editionId, name: "Verification A", code: "A" });
  const b = await editor.mutation(api.schools.save, { editionId, name: "Verification B", code: "B" });
  const eventId = await editor.mutation(api.events.save, { editionId, title: "Verification quiz", categoryId: categories[1]._id, startsAt: 1_800_000_000_000, participatingSchoolIds: [a, b] });
  return { t, superAdmin, editor, regular, revoked, editionId, categories, a, b, eventId };
}

describe("Convex scoring and management integration", () => {
  it("changes event status deliberately without implicitly publishing results", async()=>{
    const s=await setup();
    for(const status of ["live","completed"] as const){await s.editor.mutation(api.events.save,{editionId:s.editionId,id:s.eventId,title:"Verification quiz",categoryId:s.categories[1]._id,startsAt:1_800_000_000_000,status});const events=await s.t.query(api.events.listPublic,{editionId:s.editionId});expect(events.find(event=>event._id===s.eventId)?.status).toBe(status);expect(events.find(event=>event._id===s.eventId)?.hasPublishedResults).toBe(false)}
  });
  it("preserves draft isolation, publishes once, corrects by delta, revokes once, and preserves audit", async () => {
    const s = await setup();
    const draft = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points: 10 }, { schoolId: s.b, points: 6 }] });
    expect(await s.t.query(api.results.getPublishedByEvent, { eventId: s.eventId })).toEqual([]);
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId })).map(row => row.points)).toEqual([0, 0]);
    const preview = await s.editor.query(api.results.preview, { eventId: s.eventId, draftRevisionId: draft });
    const publication = { eventId: s.eventId, draftRevisionId: draft, expectedActiveRevisionId: preview.expectedActiveRevisionId, expectedDraftVersion: preview.expectedDraftVersion };
    await expect(s.editor.mutation(api.results.publish, publication)).rejects.toThrow("FORBIDDEN");
    await s.superAdmin.mutation(api.results.publish, publication);
    expect(await s.superAdmin.mutation(api.results.publish, publication)).toEqual({ status: "already_published" });
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId })).map(row => row.points)).toEqual([10, 6]);
    expect((await s.t.query(api.scoreboard.getCategory, { editionId: s.editionId, categoryId: s.categories[1]._id })).map(row => row.points)).toEqual([10, 6]);
    const correction = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, reason: "Judge correction", entries: [{ schoolId: s.a, points: 8 }, { schoolId: s.b, points: 6 }] });
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId }))[0].points).toBe(10);
    const revised = await s.editor.query(api.results.preview, { eventId: s.eventId, draftRevisionId: correction });
    expect(revised.changes.find(row => row.schoolId === s.a)?.delta).toBe(-2);
    await s.superAdmin.mutation(api.results.publish, { eventId: s.eventId, draftRevisionId: correction, expectedActiveRevisionId: revised.expectedActiveRevisionId, expectedDraftVersion: revised.expectedDraftVersion });
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId })).map(row => row.points)).toEqual([8, 6]);
    await expect(s.superAdmin.mutation(api.results.revoke, { eventId: s.eventId, reason: "Stale withdrawal", expectedActiveRevisionId: draft })).rejects.toThrow("STALE_REVISION");
    await s.superAdmin.mutation(api.results.revoke, { eventId: s.eventId, reason: "Withdrawn by judges", expectedActiveRevisionId: correction });
    expect(await s.superAdmin.mutation(api.results.revoke, { eventId: s.eventId, reason: "Retry", expectedActiveRevisionId: correction })).toEqual({ status: "already_revoked" });
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId })).map(row => row.points)).toEqual([0, 0]);
    const audit = await s.superAdmin.query(api.admins.listAudit, {});
    expect(audit.filter(row => row.action === "results.publish")).toHaveLength(2);
    expect(audit.filter(row => row.action === "results.revoke")).toHaveLength(1);
    await expect(s.editor.mutation(api.events.save,{editionId:s.editionId,id:s.eventId,title:"Verification quiz",categoryId:s.categories[0]._id,startsAt:1_800_000_000_000})).rejects.toThrow("Cannot change category after publication");
  });

  it("rejects unauthorized callers for every administrative operation and protects admin reads", async () => {
    const s = await setup();
    const draft = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{schoolId:s.a,points:5}] });
    const photo = await s.editor.mutation(api.gallery.add, { editionId:s.editionId,driveFileId:"p".repeat(25),altText:"Private draft" });
    const announcement = await s.editor.mutation(api.announcements.save, {editionId:s.editionId,title:"Private draft",body:"PRIVATE"});
    for (const caller of [s.t, s.regular, s.revoked]) {
      await expect(caller.mutation(api.schools.save, { editionId: s.editionId, name: "Forbidden" })).rejects.toThrow();
      await expect(caller.mutation(api.events.save, { editionId: s.editionId, categoryId: s.categories[0]._id, title: "Forbidden", startsAt: 1 })).rejects.toThrow();
      await expect(caller.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [] })).rejects.toThrow();
      await expect(caller.query(api.results.getAdminByEvent, { eventId: s.eventId })).rejects.toThrow();
      await expect(caller.query(api.admins.listAudit, {})).rejects.toThrow();
      await expect(caller.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: "a".repeat(25), altText: "Forbidden" })).rejects.toThrow();
      await expect(caller.mutation(api.announcements.save, { editionId: s.editionId, title: "Forbidden", body: "Forbidden" })).rejects.toThrow();
      await expect(caller.mutation(api.results.publish, {eventId:s.eventId,draftRevisionId:draft,expectedActiveRevisionId:null,expectedDraftVersion:1})).rejects.toThrow();
      await expect(caller.mutation(api.results.revoke, {eventId:s.eventId,reason:"Forbidden",expectedActiveRevisionId:null})).rejects.toThrow();
      await expect(caller.mutation(api.admins.save, {authUserId:"test|escalation",displayName:"Forbidden",role:"super_admin",isActive:true})).rejects.toThrow();
      await expect(caller.mutation(api.siteSettings.update, {editionId:s.editionId,eventTitle:"Forbidden"})).rejects.toThrow();
      await expect(caller.mutation(api.gallery.hide, {itemId:photo})).rejects.toThrow();
      await expect(caller.action(api.gallery.approve, {itemId:photo,consentConfirmed:true})).rejects.toThrow();
      await expect(caller.mutation(api.announcements.setStatus, {id:announcement,status:"published"})).rejects.toThrow();
    }
    expect(await s.t.query(api.gallery.listApproved,{editionId:s.editionId})).toEqual([]);
    expect(await s.t.query(api.announcements.listPublic,{editionId:s.editionId})).toEqual([]);
  });

  it("rejects invalid and duplicate records, invalid scores and cross-edition references", async () => {
    const s = await setup();
    await expect(s.editor.mutation(api.schools.save, { editionId: s.editionId, name: "  " })).rejects.toThrow();
    await expect(s.editor.mutation(api.schools.save, { editionId: s.editionId, name: "verification a" })).rejects.toThrow();
    await expect(s.editor.mutation(api.schools.save, { editionId: s.editionId, name: "Other", code: "a" })).rejects.toThrow();
    await expect(s.editor.mutation(api.events.save,{editionId:s.editionId,title:"Invalid end",categoryId:s.categories[0]._id,startsAt:1,endsAt:Number.POSITIVE_INFINITY})).rejects.toThrow("Invalid schedule");
    for (const points of [-1, 1.5]) await expect(s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points }] })).rejects.toThrow();
    const foreign = await s.t.run(async ctx => {
      const editionId = await ctx.db.insert("editions", { name: "Other edition", slug: "other", year: 2027, timezone: "Asia/Kolkata", status: "draft", isCurrent: false, createdAt: 1, updatedAt: 1 });
      return ctx.db.insert("schools", { editionId, name: "Foreign", status: "active", createdAt: 1, updatedAt: 1 });
    });
    await expect(s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: foreign, points: 5 }] })).rejects.toThrow("Invalid school");
  });

  it("rejects stale draft publication and preserves private fields", async () => {
    const s = await setup();
    const draft = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points: 5 }] });
    const stale = await s.editor.query(api.results.preview, { eventId: s.eventId, draftRevisionId: draft });
    await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, expectedDraftVersion: stale.expectedDraftVersion, entries: [{ schoolId: s.a, points: 7 }] });
    await expect(s.superAdmin.mutation(api.results.publish, { eventId: s.eventId, draftRevisionId: draft, expectedActiveRevisionId: null, expectedDraftVersion: stale.expectedDraftVersion })).rejects.toThrow("STALE_DRAFT");
    const current = await s.editor.query(api.results.preview, { eventId: s.eventId, draftRevisionId: draft });
    await s.t.run(async ctx => { const row = await ctx.db.query("resultEntries").withIndex("by_revision", q => q.eq("revisionId", draft)).first(); await ctx.db.patch(row!._id, { remarks: "PRIVATE_NOTE", displayParticipantName: "PRIVATE_NAME", namePublishingApproved: false }); });
    await s.superAdmin.mutation(api.results.publish, { eventId: s.eventId, draftRevisionId: draft, expectedActiveRevisionId: null, expectedDraftVersion: current.expectedDraftVersion });
    const publicRows = await s.t.query(api.results.getPublishedByEvent, { eventId: s.eventId });
    expect(JSON.stringify(publicRows)).not.toContain("PRIVATE");
    expect(JSON.stringify(await s.t.query(api.events.listPublic, { editionId: s.editionId }))).not.toContain("createdBy");
  });

  it("counts Common Category once and preserves ties and multiple legitimate entries", async () => {
    const s = await setup();
    const commonEvent = await s.editor.mutation(api.events.save, { editionId: s.editionId, title: "Common verification", categoryId: s.categories[5]._id, startsAt: 1 });
    const draft = await s.editor.mutation(api.results.saveDraft, { eventId: commonEvent, entries: [{ schoolId: s.a, points: 3 }, { schoolId: s.a, points: 2 }, { schoolId: s.b, points: 5 }] });
    await s.superAdmin.mutation(api.results.publish, { eventId: commonEvent, draftRevisionId: draft, expectedActiveRevisionId: null, expectedDraftVersion: 1 });
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId })).map(row => [row.points, row.rank])).toEqual([[5, 1], [5, 1]]);
    expect((await s.t.query(api.scoreboard.getCategory, { editionId: s.editionId, categoryId: s.categories[0]._id })).map(row => row.points)).toEqual([0, 0]);
  });

  it("rejects a correction publication without a reason and keeps official results unchanged", async () => {
    const s = await setup();
    const first = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points: 5 }] });
    const firstPreview = await s.editor.query(api.results.preview, { eventId: s.eventId, draftRevisionId: first });
    await s.superAdmin.mutation(api.results.publish, { eventId: s.eventId, draftRevisionId: first, expectedActiveRevisionId: firstPreview.expectedActiveRevisionId, expectedDraftVersion: firstPreview.expectedDraftVersion });
    const correction = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points: 8 }] });
    const correctionPreview = await s.editor.query(api.results.preview, { eventId: s.eventId, draftRevisionId: correction });
    await expect(s.superAdmin.mutation(api.results.publish, { eventId: s.eventId, draftRevisionId: correction, expectedActiveRevisionId: correctionPreview.expectedActiveRevisionId, expectedDraftVersion: correctionPreview.expectedDraftVersion })).rejects.toThrow("Correction reason required");
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId })).find(row => row.id === s.a)?.points).toBe(5);
  });

  it("returns unchanged without creating a duplicate publication when a correction matches the published revision", async () => {
    const s = await setup();
    const first = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points: 5, placement: 1, entryLabel: "Solo" }] });
    const firstPreview = await s.editor.query(api.results.preview, { eventId: s.eventId, draftRevisionId: first });
    await s.superAdmin.mutation(api.results.publish, { eventId: s.eventId, draftRevisionId: first, expectedActiveRevisionId: firstPreview.expectedActiveRevisionId, expectedDraftVersion: firstPreview.expectedDraftVersion });
    const duplicate = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, reason: "No actual change", entries: [{ schoolId: s.a, points: 5, placement: 1, entryLabel: "Solo" }] });
    const duplicatePreview = await s.editor.query(api.results.preview, { eventId: s.eventId, draftRevisionId: duplicate });
    const result = await s.superAdmin.mutation(api.results.publish, { eventId: s.eventId, draftRevisionId: duplicate, expectedActiveRevisionId: duplicatePreview.expectedActiveRevisionId, expectedDraftVersion: duplicatePreview.expectedDraftVersion });
    expect(result).toEqual({ status: "unchanged" });
    expect((await s.superAdmin.query(api.results.getAdminByEvent, { eventId: s.eventId })).event.activePublishedRevisionId).toBe(first);
    expect((await s.superAdmin.query(api.admins.listAudit, {})).filter(row => row.action === "results.publish")).toHaveLength(1);
  });

  it("does not allow a caller to bypass draft concurrency protection by omitting the version", async () => {
    const s = await setup();
    await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points: 5 }] });
    await expect(s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points: 9 }] })).rejects.toThrow("STALE_DRAFT");
  });

  it("paginates gallery metadata, edits, reorders and hides without exposing draft files", async () => {
    const s = await setup();
    const first = await s.editor.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: "a".repeat(25), altText: "First photo" });
    const second = await s.editor.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: "b".repeat(25), altText: "Second photo" });
    expect((await s.t.query(api.gallery.pageApproved, { editionId: s.editionId, paginationOpts: { numItems: 1, cursor: null } })).page).toEqual([]);
    await s.editor.mutation(api.gallery.updateMetadata, { itemId: first, altText: "Edited description", caption: "Approved caption" });
    await s.editor.mutation(api.gallery.move, { itemId: second, direction: "earlier" });
    const page = await s.editor.query(api.gallery.pageAdmin, { editionId: s.editionId, paginationOpts: { numItems: 1, cursor: null } });
    expect(page.page[0]._id).toBe(second);
    expect(page.isDone).toBe(false);
    const next = await s.editor.query(api.gallery.pageAdmin, { editionId: s.editionId, paginationOpts: { numItems: 1, cursor: page.continueCursor } });
    expect(next.page[0].altText).toBe("Edited description");
    await expect(s.regular.query(api.gallery.pageAdmin, { editionId: s.editionId, paginationOpts: { numItems: 1, cursor: null } })).rejects.toThrow();
    await expect(s.regular.mutation(api.gallery.hide, { itemId: first })).rejects.toThrow();
    await expect(s.editor.action(api.gallery.approve, { itemId: first, consentConfirmed: false })).rejects.toThrow();
    await expect(s.t.query(api.gallery.getApprovedItem,{itemId:first,proxySecret:"not-the-server-secret"})).rejects.toThrow();
    await s.t.run(async ctx=>{await ctx.db.patch(first,{approvalStatus:"approved",consentConfirmed:true,verifiedMd5Checksum:"isolated-fixture-checksum"})});
    const publicPhotos=await s.t.query(api.gallery.listApproved,{editionId:s.editionId});
    expect(publicPhotos).toHaveLength(1);
    expect(JSON.stringify(publicPhotos)).not.toContain("driveFileId");
    expect(JSON.stringify(publicPhotos)).not.toContain("addedBy");
    await s.editor.mutation(api.gallery.hide, { itemId: first });
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
  });
});
