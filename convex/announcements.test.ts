/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
const modules = import.meta.glob("./**/*.ts");

async function setup() {
  const t = convexTest(schema, modules), admin = t.withIdentity({ subject: "admin", tokenIdentifier: "test|admin" });
  const editor = t.withIdentity({ subject: "editor", tokenIdentifier: "test|editor" });
  const regular = t.withIdentity({ subject: "regular", tokenIdentifier: "test|regular" });
  const revoked = t.withIdentity({ subject: "revoked", tokenIdentifier: "test|revoked" });
  await t.run(async ctx => {
    await ctx.db.insert("admins", { authUserId: "test|admin", displayName: "Admin", role: "super_admin", isActive: true, createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("admins", { authUserId: "test|editor", displayName: "Editor", role: "editor", isActive: true, createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("admins", { authUserId: "test|revoked", displayName: "Revoked", role: "editor", isActive: false, createdAt: 1, updatedAt: 1 });
  });
  const editionId = await admin.mutation(api.editions.initialize, { name: "Announcement test", year: 2026 });
  return { t, admin, editor, regular, revoked, editionId };
}

describe("announcements", () => {
  it("publishes, deletes permanently and keeps unrelated announcements and audit history", async () => {
    const s = await setup();
    const kept = await s.editor.mutation(api.announcements.save, { editionId: s.editionId, title: "Kept", body: "Stays" });
    const doomed = await s.editor.mutation(api.announcements.save, { editionId: s.editionId, title: "Doomed", body: "Goes" });
    await s.editor.mutation(api.announcements.publish, { id: doomed });
    expect((await s.t.query(api.announcements.listPublic, { editionId: s.editionId })).map(item => item._id)).toEqual([doomed]);
    expect(await s.editor.mutation(api.announcements.remove, { id: doomed })).toEqual({ status: "deleted" });
    expect((await s.editor.query(api.announcements.listAdmin, { editionId: s.editionId })).map(item => item._id)).toEqual([kept]);
    expect(await s.t.query(api.announcements.listPublic, { editionId: s.editionId })).toEqual([]);
    const audit = await s.t.run(ctx => ctx.db.query("auditLogs").collect());
    expect(audit.filter(row => row.action === "announcement.delete").map(row => ({ entityId: row.entityId, summary: row.summary }))).toEqual([{ entityId: doomed, summary: "Doomed" }]);
    expect(audit.filter(row => row.action === "announcement.published")).toHaveLength(1);
  });

  it("returns published announcements to draft when edited", async () => {
    const s = await setup();
    const id = await s.editor.mutation(api.announcements.save, { editionId: s.editionId, title: "Original", body: "Body" });
    await s.editor.mutation(api.announcements.publish, { id });
    await s.editor.mutation(api.announcements.save, { editionId: s.editionId, id, title: "Revised", body: "Body" });
    expect(await s.t.query(api.announcements.listPublic, { editionId: s.editionId })).toEqual([]);
    const [row] = await s.editor.query(api.announcements.listAdmin, { editionId: s.editionId });
    expect(row).toMatchObject({ title: "Revised", status: "draft" });
  });

  it("rejects missing announcements and callers without an active admin role", async () => {
    const s = await setup();
    const id = await s.editor.mutation(api.announcements.save, { editionId: s.editionId, title: "Gone", body: "Body" });
    await s.t.run(ctx => ctx.db.delete(id));
    await expect(s.editor.mutation(api.announcements.remove, { id })).rejects.toThrow("Announcement missing");
    for (const caller of [s.t, s.regular, s.revoked]) await expect(caller.mutation(api.announcements.remove, { id })).rejects.toThrow();
    const live = await s.editor.mutation(api.announcements.save, { editionId: s.editionId, title: "Live", body: "Body" });
    for (const caller of [s.t, s.regular, s.revoked]) await expect(caller.mutation(api.announcements.remove, { id: live })).rejects.toThrow();
    expect((await s.editor.query(api.announcements.listAdmin, { editionId: s.editionId })).map(item => item._id)).toEqual([live as Id<"announcements">]);
  });
});
