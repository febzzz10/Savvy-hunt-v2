/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";
const modules = import.meta.glob("./**/*.ts");

describe("homepage official achievements", () => {
  it("isolates drafts, returns active corrections, protects names, and omits revoked results", async () => {
    const t = convexTest(schema, modules);
    const fixture = await t.run(async ctx => {
      const editionId = await ctx.db.insert("editions", { name: "Test", slug: "test", year: 2026, timezone: "Asia/Kolkata", status: "active", isCurrent: true, createdAt: 1, updatedAt: 1 });
      const categoryId = await ctx.db.insert("categories", { editionId, name: "Arts", slug: "arts", sortOrder: 0, isActive: true });
      const schoolId = await ctx.db.insert("schools", { editionId, name: "Official School", status: "active", createdAt: 1, updatedAt: 1 });
      const eventId = await ctx.db.insert("events", { editionId, categoryId, title: "Official Event", slug: "official-event", startsAt: 1, status: "completed", resultStatus: "draft", isFeatured: false, createdBy: "test", createdAt: 1, updatedAt: 1 });
      const revisionId = await ctx.db.insert("resultRevisions", { eventId, revisionNumber: 1, status: "draft", createdBy: "test", createdAt: 1 });
      const entryId = await ctx.db.insert("resultEntries", { eventId, revisionId, schoolId, placement: 1, points: 10, displayParticipantName: "Private name", namePublishingApproved: false, entryLabel: "Team A", sortOrder: 0 });
      return { editionId, eventId, revisionId, schoolId, entryId };
    });
    const read = () => t.query(api.results.listRecentPublished, { editionId: fixture.editionId, limit: 3 });
    expect(await read()).toEqual([]);
    // Even an invalid pointer to a draft must not leak it.
    await t.run(ctx => ctx.db.patch(fixture.eventId, { activePublishedRevisionId: fixture.revisionId }));
    expect(await read()).toEqual([]);
    await t.run(async ctx => {
      await ctx.db.patch(fixture.revisionId, { status: "published", publishedAt: 10 });
      await ctx.db.patch(fixture.eventId, { resultStatus: "published" });
    });
    const [official] = await read();
    expect(official.entries[0]).toMatchObject({ schoolName: "Official School", placement: 1, points: 10, entryLabel: "Team A" });
    expect(JSON.stringify(official)).not.toContain("Private name");
    const correction = await t.run(async ctx => {
      const revisionId = await ctx.db.insert("resultRevisions", { eventId: fixture.eventId, revisionNumber: 2, status: "draft", createdBy: "test", createdAt: 20 });
      await ctx.db.insert("resultEntries", { eventId: fixture.eventId, revisionId, schoolId: fixture.schoolId, placement: 2, points: 6, sortOrder: 0, displayParticipantName: "Approved name", namePublishingApproved: true });
      return revisionId;
    });
    expect((await read())[0].entries[0].points).toBe(10);
    await t.run(async ctx => {
      await ctx.db.patch(fixture.revisionId, { status: "superseded" });
      await ctx.db.patch(correction, { status: "published", publishedAt: 30 });
      await ctx.db.patch(fixture.eventId, { activePublishedRevisionId: correction });
    });
    expect((await read())[0]).toMatchObject({ publishedAt: 30, entries: [{ placement: 2, points: 6, participantName: "Approved name" }] });
    await t.run(ctx => ctx.db.patch(correction, { status: "revoked" }));
    expect(await read()).toEqual([]);
  });
});
