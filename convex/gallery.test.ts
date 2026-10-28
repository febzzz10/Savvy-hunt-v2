/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import type { DriveMetadata } from "../lib/drive-validation";
import { serviceAccountTestKey } from "../tests/service-account-fixture";
const modules = import.meta.glob("./**/*.ts");
const fileId = "drive_photo_123456789012345";
const checksum = "a".repeat(32);
const image = (id = fileId, folder = "approved", md5 = checksum): DriveMetadata => ({ id, name: "school.png", mimeType: "image/png", size: "1000", parents: [folder], md5Checksum: md5, createdTime: "2026-10-01T00:00:00Z" });
function mockDrive(files: DriveMetadata[], options: { failListing?: boolean; paginated?: boolean } = {}) {
  const fetcher = vi.fn(async (input: string | URL, init?: RequestInit) => {
    const url = new URL(String(input));
    if (url.hostname !== "oauth2.googleapis.com" && init?.method && init.method !== "GET") throw new Error("Gallery attempted a Drive write");
    if (url.hostname === "oauth2.googleapis.com") return Response.json({ access_token: "test-access" });
    if (url.pathname === "/drive/v3/files") {
      if (options.failListing) return Response.json({ error: {} }, { status: 503 });
      const folder = url.searchParams.get("q")?.includes("'incoming'") ? "incoming" : "approved";
      const matching = files.filter(file => !file.trashed && file.parents?.includes(folder));
      if (options.paginated && !url.searchParams.has("pageToken")) return Response.json({ files: [], nextPageToken: "page2" });
      return Response.json({ files: matching });
    }
    const id = url.pathname.split("/").at(-1);
    if (["incoming", "approved"].includes(id ?? "")) return Response.json({ id, mimeType: "application/vnd.google-apps.folder", capabilities: { canAddChildren: true } });
    const file = files.find(file => file.id === id);
    if (!file) return Response.json({}, { status: 404 });
    return Response.json(file);
  });
  vi.stubGlobal("fetch", fetcher);
  return fetcher;
}
async function setup() {
  const t = convexTest(schema, modules), admin = t.withIdentity({ subject: "admin", tokenIdentifier: "test|admin" });
  const regular = t.withIdentity({ subject: "regular", tokenIdentifier: "test|regular" });
  const revoked = t.withIdentity({ subject: "revoked", tokenIdentifier: "test|revoked" });
  await t.run(async ctx => {
    await ctx.db.insert("admins", { authUserId: "test|admin", displayName: "Admin", role: "super_admin", isActive: true, createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("admins", { authUserId: "test|revoked", displayName: "Revoked", role: "editor", isActive: false, createdAt: 1, updatedAt: 1 });
  });
  const editionId = await admin.mutation(api.editions.initialize, { name: "Gallery test", year: 2026 });
  return { t, admin, regular, revoked, editionId };
}
beforeEach(async () => {
  const key = await serviceAccountTestKey();
  vi.useFakeTimers();
  vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "approved"); vi.stubEnv("GOOGLE_DRIVE_INCOMING_FOLDER_ID", "incoming");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "gallery@test.iam.gserviceaccount.com"); vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", key);
});
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Drive-only gallery workflow", () => {
  it("imports every Drive page as pending, including approved-folder arrivals, without duplicates", async () => {
    const s = await setup(); const files = [image(fileId, "incoming"), image("approved_photo_12345678901", "approved")];
    const fetcher = mockDrive(files, { paginated: true });
    for (let i = 0; i < 2; i++) {
      expect(await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId })).toEqual({ started: true });
      expect(await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId })).toEqual({ started: false });
      await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    }
    const rows = await s.admin.query(api.gallery.pageAdmin, { editionId: s.editionId, paginationOpts: { numItems: 12, cursor: null } });
    expect(rows.page).toHaveLength(2);
    for (const row of rows.page) expect(row).toMatchObject({ source: "drive", filename: "school.png", approvalStatus: "pending", consentConfirmed: false });
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
    expect(fetcher.mock.calls.some(call => String(call[0]).includes("pageToken=page2"))).toBe(true);
    expect((await s.admin.query(api.gallerySyncData.getState, { editionId: s.editionId }))?.lastError).toBeUndefined();
  });
  it("enforces consent with read-only Drive access, records audit and exposes reactive public metadata", async () => {
    const s = await setup(); const files = [image()]; const fetcher = mockDrive(files);
    const itemId = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "School ceremony" });
    await expect(s.admin.action(api.gallery.approve, { itemId, consentConfirmed: false })).rejects.toThrow("Photo consent confirmation required");
    expect(fetcher).not.toHaveBeenCalled();
    await s.admin.action(api.gallery.approve, { itemId, consentConfirmed: true, expectedMd5Checksum: checksum, expectedReviewVersion: 0 });
    expect(files[0].id).toBe(fileId); expect(files[0].parents).toEqual(["approved"]);
    expect(fetcher.mock.calls.every(([url, init]) => String(url).includes("oauth2.googleapis.com") || !init?.method || init.method === "GET")).toBe(true);
    const item = await s.t.run(ctx => ctx.db.get(itemId));
    expect(item).toMatchObject({ approvalStatus: "approved", consentMd5Checksum: checksum, approvedBy: "test|admin", consentConfirmedBy: "test|admin" });
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([{ _id: itemId, altText: "School ceremony" }]);
    await s.admin.mutation(api.gallery.reject, { itemId, reason: "Consent withdrawn" });
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect((await s.t.run(ctx => ctx.db.get(itemId)))?.approvalStatus).toBe("rejected");
  });
  it("keeps removed records, withdraws changed content, and never restores approval on reappearance", async () => {
    const s = await setup(); const files = [image(), image("second_photo_1234567890123")]; mockDrive(files);
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const rows = (await s.admin.query(api.gallery.pageAdmin, { editionId: s.editionId, paginationOpts: { numItems: 12, cursor: null } })).page;
    for (const row of rows) await s.admin.action(api.gallery.approve, { itemId: row._id, consentConfirmed: true, expectedMd5Checksum: checksum, expectedReviewVersion: 0 });
    files[0].md5Checksum = "b".repeat(32); files[1].trashed = true;
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
    for (const row of rows) expect(await s.t.run(ctx => ctx.db.get(row._id))).toMatchObject({ consentConfirmed: false, approvalStatus: "pending" });
    expect((await s.t.run(ctx => ctx.db.get(rows[1]._id)))?.availability).toBe("missing");
    files[1].trashed = false;
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
  });
  it("does not reconcile deletions after failed listings and records an actionable error", async () => {
    const s = await setup(); mockDrive([], { failListing: true });
    const itemId = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "Photo" });
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect((await s.t.run(ctx => ctx.db.get(itemId)))?.availability).toBeUndefined();
    expect((await s.admin.query(api.gallerySyncData.getState, { editionId: s.editionId }))?.lastError).toContain("503");
  });
  it("identifies missing approved-folder configuration and leaves the photo unpublished", async () => {
    const s = await setup(); mockDrive([image()]); vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "");
    const itemId = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "Photo" });
    await expect(s.admin.action(api.gallery.approve, { itemId, consentConfirmed: true, expectedMd5Checksum: checksum, expectedReviewVersion: 0 })).rejects.toThrow("GOOGLE_DRIVE_FOLDER_ID");
    await expect(s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId })).rejects.toThrow("GOOGLE_DRIVE_FOLDER_ID");
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
  });
  it("denies anonymous, ordinary and revoked users every privileged gallery entry point", async () => {
    const s = await setup(); const fetcher = mockDrive([image()]);
    const itemId = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "Photo" });
    for (const caller of [s.t, s.regular, s.revoked]) {
      await expect(caller.action(api.gallerySync.syncNow, { editionId: s.editionId })).rejects.toThrow();
      await expect(caller.action(api.gallery.approve, { itemId, consentConfirmed: true, expectedMd5Checksum: checksum, expectedReviewVersion: 0 })).rejects.toThrow();
      await expect(caller.mutation(api.gallery.reject, { itemId, reason: "No" })).rejects.toThrow();
      await expect(caller.query(api.gallery.getPreviewItem, { itemId })).rejects.toThrow();
    }
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("rejects stale approval after another reviewer hides the photo", async () => {
    const s = await setup(); const itemId = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "Photo" });
    await s.admin.mutation(api.gallery.hide, { itemId });
    await expect(s.t.mutation(internal.gallery.publishVerified, { itemId, actorAuthUserId: "test|admin", expectedDriveFileId: fileId, expectedReviewVersion: 0, verifiedMd5Checksum: checksum, filename: "school.png", consentConfirmed: true })).rejects.toThrow("changed during verification");
  });
  it("does not publish replacement bytes using the consent confirmation from an older preview", async () => {
    const s = await setup(); const files = [image()]; mockDrive(files);
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const item = (await s.admin.query(api.gallery.pageAdmin, { editionId: s.editionId, paginationOpts: { numItems: 12, cursor: null } })).page[0];
    expect(await s.admin.query(api.gallery.getPreviewItem, { itemId: item._id })).toMatchObject({ verifiedMd5Checksum: checksum });
    files[0].md5Checksum = "b".repeat(32);
    await expect(s.admin.action(api.gallery.approve, { itemId: item._id, consentConfirmed: true, expectedMd5Checksum: checksum, expectedReviewVersion: 0 })).rejects.toThrow("content changed after review");
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
  });
  it("prevents duplicate publication when an old hidden row precedes an approved legacy duplicate", async () => {
    const s = await setup(); mockDrive([image(fileId, "approved")]);
    const first = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "Old photo" });
    await s.admin.mutation(api.gallery.hide, { itemId: first });
    await s.t.run(async ctx => { const row = (await ctx.db.get(first))!; const { _id, _creationTime, ...fields } = row; void _id; void _creationTime; await ctx.db.insert("galleryItems", { ...fields, approvalStatus: "approved", consentConfirmed: true, verifiedMd5Checksum: checksum }); });
    await expect(s.admin.action(api.gallery.approve, { itemId: first, consentConfirmed: true, expectedMd5Checksum: checksum, expectedReviewVersion: 1 })).rejects.toThrow("already has an approved");
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toHaveLength(1);
  });
  it("withdraws publication when an approved file moves back to Incoming and does not restore it automatically", async () => {
    const s = await setup(); const files = [image()]; mockDrive(files);
    const itemId = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "Photo" });
    await s.admin.action(api.gallery.approve, { itemId, consentConfirmed: true, expectedMd5Checksum: checksum, expectedReviewVersion: 0 });
    files[0].parents = ["incoming"];
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await s.t.run(ctx => ctx.db.get(itemId))).toMatchObject({ approvalStatus: "pending", consentConfirmed: false });
    files[0].parents = ["approved"];
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
  });
  it("uses the existing cron target with Incoming defaulted to the gallery folder", async () => {
    const s = await setup(); vi.stubEnv("GOOGLE_DRIVE_INCOMING_FOLDER_ID", "");
    const fetcher = mockDrive([image()]);
    await s.t.action(internal.gallerySync.poll, {}); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    const rows = (await s.admin.query(api.gallery.pageAdmin, { editionId: s.editionId, paginationOpts: { numItems: 12, cursor: null } })).page;
    expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ approvalStatus: "pending", consentConfirmed: false, source: "drive" });
    expect(fetcher.mock.calls.filter(([input]) => new URL(String(input)).pathname === "/drive/v3/files")).toHaveLength(1);
  });
  it("requires organizers to move separate Incoming files manually before approval", async () => {
    const s = await setup(); const files = [image(fileId, "incoming")]; const fetcher = mockDrive(files);
    const itemId = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "Photo" });
    await expect(s.admin.action(api.gallery.approve, { itemId, consentConfirmed: true, expectedMd5Checksum: checksum, expectedReviewVersion: 0 })).rejects.toThrow("move the photo into the gallery folder manually");
    expect(files[0].parents).toEqual(["incoming"]);
    expect(fetcher.mock.calls.every(([url, init]) => String(url).includes("oauth2.googleapis.com") || !init?.method || init.method === "GET")).toBe(true);
    expect(await s.t.query(api.gallery.listApproved, { editionId: s.editionId })).toEqual([]);
  });
  it("preserves legacy admin metadata and publication audit when syncing", async () => {
    const s = await setup(); mockDrive([image()]);
    const itemId = await s.admin.mutation(api.gallery.add, { editionId: s.editionId, driveFileId: fileId, altText: "Legacy photo" });
    await s.t.run(ctx => ctx.db.patch(itemId, { source: "admin", approvalStatus: "hidden", approvedBy: "historical-admin", approvedAt: 10, caption: "Historical caption" }));
    await s.admin.action(api.gallerySync.syncNow, { editionId: s.editionId }); await s.t.finishAllScheduledFunctions(() => vi.runAllTimers());
    expect(await s.t.run(ctx => ctx.db.get(itemId))).toMatchObject({ source: "admin", approvalStatus: "hidden", approvedBy: "historical-admin", approvedAt: 10, caption: "Historical caption" });
  });

});
