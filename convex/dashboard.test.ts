/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
import { gallerySummary } from "./dashboard";
import type { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

type Summary = {
  total: number;
  pending: number;
  recent: Array<{ _id: Id<"galleryItems">; altText: string; filename?: string; approvalStatus: string; createdAt: number; previewable: boolean }>;
};

async function setup() {
  const t = convexTest(schema, modules);
  const superAdmin = t.withIdentity({ subject: "owner", tokenIdentifier: "test|owner" });
  const editor = t.withIdentity({ subject: "editor", tokenIdentifier: "test|editor" });
  const revoked = t.withIdentity({ subject: "revoked", tokenIdentifier: "test|revoked" });
  await t.run(async ctx => {
    await ctx.db.insert("admins", { authUserId: "test|owner", displayName: "Owner", role: "super_admin", isActive: true, createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("admins", { authUserId: "test|editor", displayName: "Editor", role: "editor", isActive: true, createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("admins", { authUserId: "test|revoked", displayName: "Revoked", role: "editor", isActive: false, createdAt: 1, updatedAt: 1 });
  });
  const editionId = await superAdmin.mutation(api.editions.initialize, { name: "Gallery summary", year: 2026 });
  return { t, superAdmin, editor, revoked, editionId };
}

type TestClient = Awaited<ReturnType<typeof setup>>["superAdmin"];
const readSummary = (client: TestClient, editionId: Id<"editions">) =>
  (client.query as unknown as (fn: unknown, args: { editionId: Id<"editions"> }) => Promise<Summary>)(gallerySummary, { editionId });

async function photo(t: Awaited<ReturnType<typeof setup>>["t"], editionId: Id<"editions">, index: number, fields: Partial<{ approvalStatus: "draft" | "pending" | "approved" | "hidden" | "rejected"; createdAt: number; sortOrder: number; verifiedMd5Checksum: string; availability: "present" | "missing"; filename: string }> = {}) {
  return t.run(ctx => ctx.db.insert("galleryItems", {
    editionId, driveFileId: `drive_summary_${String(index).padStart(15, "0")}`, altText: `Photo ${index}`, sortOrder: index,
    approvalStatus: "pending", consentConfirmed: false, addedBy: "test|owner", createdAt: index, ...fields,
  }));
}

describe("dashboard gallery summary", () => {
  it("requires an active admin and allows editors to read it", async () => {
    const s = await setup();
    await expect(readSummary(s.t, s.editionId)).rejects.toThrow("UNAUTHENTICATED");
    await expect(readSummary(s.revoked, s.editionId)).rejects.toThrow("FORBIDDEN");
    expect(await readSummary(s.editor, s.editionId)).toEqual({ total: 0, pending: 0, recent: [] });
  });

  it("counts every record and treats draft plus pending as awaiting review", async () => {
    const s = await setup();
    await photo(s.t, s.editionId, 1, { approvalStatus: "draft" });
    await photo(s.t, s.editionId, 2, { approvalStatus: "pending" });
    await photo(s.t, s.editionId, 3, { approvalStatus: "approved" });
    await photo(s.t, s.editionId, 4, { approvalStatus: "hidden" });
    await photo(s.t, s.editionId, 5, { approvalStatus: "rejected" });
    const summary = await readSummary(s.superAdmin, s.editionId);
    expect(summary).toMatchObject({ total: 5, pending: 2 });
  });

  it("orders recent uploads by createdAt rather than the mutable sort order", async () => {
    const s = await setup();
    const newest = await photo(s.t, s.editionId, 1, { createdAt: 900, sortOrder: 1 });
    const middle = await photo(s.t, s.editionId, 2, { createdAt: 500, sortOrder: 99 });
    const oldest = await photo(s.t, s.editionId, 3, { createdAt: 100, sortOrder: 50 });
    const summary = await readSummary(s.superAdmin, s.editionId);
    expect(summary.recent.map(item => item._id)).toEqual([newest, middle, oldest]);
    expect(summary.recent.map(item => item.createdAt)).toEqual([900, 500, 100]);
  });

  it("reports whether a preview checksum is available and keeps only five recents", async () => {
    const s = await setup();
    for (let i = 1; i <= 6; i++) await photo(s.t, s.editionId, i, { createdAt: i * 10, verifiedMd5Checksum: i === 6 ? "a".repeat(32) : undefined, filename: `photo-${i}.jpg` });
    const summary = await readSummary(s.superAdmin, s.editionId);
    expect(summary.recent).toHaveLength(5);
    expect(summary.recent[0]).toMatchObject({ filename: "photo-6.jpg", previewable: true });
    expect(summary.recent[1].previewable).toBe(false);
  });
});
