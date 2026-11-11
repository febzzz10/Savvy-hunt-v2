/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules);
  const superAdmin = t.withIdentity({ subject: "super", tokenIdentifier: "test|super" });
  const editor = t.withIdentity({ subject: "editor", tokenIdentifier: "test|editor" });
  const regular = t.withIdentity({ subject: "regular", tokenIdentifier: "test|regular" });
  const inactive = t.withIdentity({ subject: "inactive", tokenIdentifier: "test|inactive" });
  await t.run(async ctx => {
    for (const [name, role, isActive] of [["super", "super_admin", true], ["editor", "editor", true], ["inactive", "editor", false]] as const) {
      await ctx.db.insert("admins", { authUserId: `test|${name}`, displayName: name, role, isActive, createdAt: 1, updatedAt: 1 });
    }
  });
  const editionId = await superAdmin.mutation(api.editions.initialize, { name: "School deletion tests", year: 2026 });
  const categories = await t.query(api.categories.listCurrent, { editionId });
  const a = await editor.mutation(api.schools.save, { editionId, name: "Alpha", code: "A" });
  const b = await editor.mutation(api.schools.save, { editionId, name: "Beta", code: "B" });
  const eventId = await editor.mutation(api.events.save, { editionId, title: "Deletion event", categoryId: categories[0]._id, startsAt: 1_800_000_000_000, participatingSchoolIds: [a, b] });
  async function school(id: Id<"schools"> = a) { return (await t.run(ctx => ctx.db.get(id)))!; }
  async function remove(id: Id<"schools"> = a, expectedUpdatedAt?: number) {
    return editor.mutation(api.schools.remove, { editionId, schoolId: id, expectedUpdatedAt: expectedUpdatedAt ?? (await school(id)).updatedAt });
  }
  async function publish(entries: { schoolId: Id<"schools">; points: number }[]) {
    const draftRevisionId = await editor.mutation(api.results.saveDraft, { eventId, entries });
    const preview = await editor.query(api.results.preview, { eventId, draftRevisionId });
    await superAdmin.mutation(api.results.publish, { eventId, draftRevisionId, expectedActiveRevisionId: preview.expectedActiveRevisionId, expectedDraftVersion: preview.expectedDraftVersion });
    return draftRevisionId;
  }
  return { t, superAdmin, editor, regular, inactive, editionId, categories, a, b, eventId, school, remove, publish };
}

describe("school deletion", () => {
  it("deletes an eligible school, cleans draft references, and writes an audit entry", async () => {
    const s = await setup();
    const revisionId = await s.editor.mutation(api.results.saveDraft, { eventId: s.eventId, entries: [{ schoolId: s.a, points: 5 }, { schoolId: s.b, points: 3 }] });
    await s.remove();
    expect(await s.t.run(ctx => ctx.db.get(s.a))).toBeNull();
    expect(await s.t.run(ctx => ctx.db.query("resultEntries").withIndex("by_event_school", q => q.eq("eventId", s.eventId).eq("schoolId", s.a)).collect())).toEqual([]);
    expect(await s.t.run(ctx => ctx.db.query("resultEntries").withIndex("by_event_school", q => q.eq("eventId", s.eventId).eq("schoolId", s.b)).collect())).toHaveLength(1);
    expect(await s.t.run(ctx => ctx.db.get(revisionId))).not.toBeNull();
    expect(await s.t.run(ctx => ctx.db.get(s.eventId))).toMatchObject({ participatingSchoolIds: [s.b] });
    const gamma = await s.editor.mutation(api.schools.save, { editionId: s.editionId, name: "Gamma", code: "C" });
    await s.superAdmin.mutation(api.schools.remove, { editionId: s.editionId, schoolId: gamma, expectedUpdatedAt: (await s.school(gamma)).updatedAt });
    expect(await s.t.run(ctx => ctx.db.get(gamma))).toBeNull();
    expect((await s.editor.query(api.schools.listAdmin, { editionId: s.editionId })).map(row => row.name)).toEqual(["Beta"]);
    expect((await s.superAdmin.query(api.admins.listAudit, {})).filter(row => row.action === "school.delete").map(row => row.entityId).sort()).toEqual([s.a, gamma].sort());
  });

  it("removes an emptied draft revision and resets the event when no publication exists", async () => {
    const s = await setup();
    const eventId = await s.editor.mutation(api.events.save, { editionId: s.editionId, title: "Solo event", categoryId: s.categories[1]._id, startsAt: 1_800_000_100_000, participatingSchoolIds: [s.a] });
    const revisionId = await s.editor.mutation(api.results.saveDraft, { eventId, entries: [{ schoolId: s.a, points: 8 }] });
    await s.remove();
    expect(await s.t.run(ctx => ctx.db.get(revisionId))).toBeNull();
    expect(await s.t.run(ctx => ctx.db.get(eventId))).toMatchObject({ resultStatus: "none", participatingSchoolIds: [] });
  });

  it("rejects unauthenticated, non-admin, and inactive-admin callers", async () => {
    const s = await setup();
    const target = await s.school();
    for (const caller of [s.t, s.regular, s.inactive]) {
      await expect(caller.mutation(api.schools.remove, { editionId: s.editionId, schoolId: s.a, expectedUpdatedAt: target.updatedAt })).rejects.toThrow();
    }
    expect(await s.t.run(ctx => ctx.db.get(s.a))).not.toBeNull();
  });

  it("handles nonexistent and repeated deletion safely without duplicate audit entries", async () => {
    const s = await setup();
    const target = await s.school();
    await s.remove();
    await expect(s.editor.mutation(api.schools.remove, { editionId: s.editionId, schoolId: s.a, expectedUpdatedAt: target.updatedAt })).rejects.toThrow("School missing");
    expect((await s.superAdmin.query(api.admins.listAudit, {})).filter(row => row.action === "school.delete")).toHaveLength(1);
  });

  it("refuses schools with published, corrected, or revoked scoreboard history", async () => {
    const s = await setup();
    const revisionId = await s.publish([{ schoolId: s.a, points: 7 }, { schoolId: s.b, points: 3 }]);
    await expect(s.remove()).rejects.toThrow(/published results or scoreboard history/i);
    expect(await s.t.run(ctx => ctx.db.get(s.a))).not.toBeNull();
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId })).find(row => row.id === s.a)?.points).toBe(7);
    expect(await s.t.run(ctx => ctx.db.query("resultEntries").withIndex("by_event_school", q => q.eq("eventId", s.eventId).eq("schoolId", s.a)).collect())).not.toEqual([]);
    await s.superAdmin.mutation(api.results.revoke, { eventId: s.eventId, reason: "Withdrawn", expectedActiveRevisionId: revisionId });
    await expect(s.remove()).rejects.toThrow(/published results or scoreboard history/i);
    expect(await s.t.run(ctx => ctx.db.get(s.a))).not.toBeNull();
  });

  it("keeps the remaining scoreboard and historical results unchanged after deleting an unrelated school", async () => {
    const s = await setup();
    await s.publish([{ schoolId: s.a, points: 7 }, { schoolId: s.b, points: 3 }]);
    const extra = await s.editor.mutation(api.schools.save, { editionId: s.editionId, name: "Gamma", code: "C" });
    await s.remove(extra);
    expect(await s.t.run(ctx => ctx.db.get(extra))).toBeNull();
    expect((await s.t.query(api.scoreboard.getOverall, { editionId: s.editionId })).map(row => [row.name, row.points])).toEqual([["Alpha", 7], ["Beta", 3]]);
    expect((await s.t.query(api.results.getPublishedByEvent, { eventId: s.eventId }))).toHaveLength(2);
  });

  it("rejects a stale delete after another organizer edits the school", async () => {
    const s = await setup();
    const stale = await s.school();
    await s.editor.mutation(api.schools.save, { editionId: s.editionId, id: s.a, name: "Alpha changed", code: "A", status: "active" });
    await expect(s.remove(s.a, stale.updatedAt)).rejects.toThrow("STALE_SCHOOL");
    expect(await s.t.run(ctx => ctx.db.get(s.a))).toMatchObject({ name: "Alpha changed" });
  });
});
