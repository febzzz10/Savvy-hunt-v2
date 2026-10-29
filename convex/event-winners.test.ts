/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { expect, it } from "vitest";
import schema from "./schema";
import { api } from "./_generated/api";

it("publishes tied winners with manual points and corrects their aggregate exactly once", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.ts"));
  await t.run(ctx => ctx.db.insert("admins", { authUserId: "test|winners", displayName: "Test organizer", role: "super_admin", isActive: true, createdAt: 1, updatedAt: 1 }));
  const admin = t.withIdentity({ subject: "winners", tokenIdentifier: "test|winners" });
  const editionId = await admin.mutation(api.editions.initialize, { name: "Winners test", year: 2026 });
  const [category] = await admin.query(api.categories.listCurrent, { editionId });
  const schools = await Promise.all(["A", "B", "C", "D"].map(name => admin.mutation(api.schools.save, { editionId, name })));
  const eventId = await admin.mutation(api.events.save, { editionId, categoryId: category._id, title: "Tie test", startsAt: 1800000000000, participatingSchoolIds: schools });
  const entries = schools.map((schoolId, index) => ({ schoolId, placement: [1, 1, 2, 3][index], points: [13, 13, 8, 4][index], entryLabel: `Team ${index + 1}` }));
  const draftRevisionId = await admin.mutation(api.results.saveDraft, { eventId, entries });
  expect(await t.query(api.results.getPublishedByEvent, { eventId })).toEqual([]);
  const preview = await admin.query(api.results.preview, { eventId, draftRevisionId });
  const publication = { eventId, draftRevisionId, expectedActiveRevisionId: preview.expectedActiveRevisionId, expectedDraftVersion: preview.expectedDraftVersion };
  await admin.mutation(api.results.publish, publication);
  expect(await admin.mutation(api.results.publish, publication)).toEqual({ status: "already_published" });
  expect((await t.query(api.results.getPublishedByEvent, { eventId })).map(row => row.placement)).toEqual([1, 1, 2, 3]);
  expect((await t.query(api.scoreboard.getOverall, { editionId })).map(row => [row.rank, row.points])).toEqual([[1, 13], [1, 13], [3, 8], [4, 4]]);
  const corrected = await admin.mutation(api.results.saveDraft, { eventId, reason: "Judge revised the tied award", entries: entries.map(row => ({ ...row, points: row.placement === 1 ? 12 : row.points })) });
  const correction = await admin.query(api.results.preview, { eventId, draftRevisionId: corrected });
  expect(correction.changes.filter(row => row.delta !== 0).map(row => row.delta)).toEqual([-1, -1]);
  const apply = { eventId, draftRevisionId: corrected, expectedActiveRevisionId: correction.expectedActiveRevisionId, expectedDraftVersion: correction.expectedDraftVersion };
  await admin.mutation(api.results.publish, apply);
  await admin.mutation(api.results.publish, apply);
  expect((await t.query(api.scoreboard.getCategory, { editionId, categoryId: category._id })).map(row => row.points)).toEqual([12, 12, 8, 4]);
});
