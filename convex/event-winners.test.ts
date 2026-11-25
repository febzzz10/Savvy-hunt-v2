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
  const eventId = await admin.mutation(api.events.save, { editionId, categoryId: category._id, title: "Tie test", participatingSchoolIds: schools });
  const entries = schools.map((schoolId, index) => ({ schoolId, placement: [1, 1, 2, 3][index], points: [13, 13, 8, 4][index] }));
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

it("persists participant names, enforces approval, preserves legacy labels, and publishes name-only corrections", async () => {
  const t = convexTest(schema, import.meta.glob("./**/*.ts"));
  await t.run(ctx => ctx.db.insert("admins", { authUserId: "test|names", displayName: "Test organizer", role: "super_admin", isActive: true, createdAt: 1, updatedAt: 1 }));
  const admin = t.withIdentity({ subject: "names", tokenIdentifier: "test|names" });
  const editionId = await admin.mutation(api.editions.initialize, { name: "Names test", year: 2026 });
  const [category] = await admin.query(api.categories.listCurrent, { editionId });
  const [schoolA, schoolB] = await Promise.all(["A", "B"].map(name => admin.mutation(api.schools.save, { editionId, name })));
  const eventId = await admin.mutation(api.events.save, { editionId, categoryId: category._id, title: "Names test event", participatingSchoolIds: [schoolA, schoolB] });
  const entries = [
    { schoolId: schoolA, placement: 1, points: 10, displayParticipantName: "  Asha  " },
    { schoolId: schoolB, placement: 2, points: 5, displayParticipantName: "   " },
  ];
  const draftRevisionId = await admin.mutation(api.results.saveDraft, { eventId, entries });
  const draft = await admin.query(api.results.getAdminByEvent, { eventId });
  const draftBySchool = new Map(draft.draftEntries.map(row => [row.schoolId, row]));
  expect(draftBySchool.get(schoolA)).toMatchObject({ displayParticipantName: "Asha" });
  expect(draftBySchool.get(schoolB)?.displayParticipantName).toBeUndefined();

  const firstPreview = await admin.query(api.results.preview, { eventId, draftRevisionId });
  await admin.mutation(api.results.publish, { eventId, draftRevisionId, expectedActiveRevisionId: firstPreview.expectedActiveRevisionId, expectedDraftVersion: firstPreview.expectedDraftVersion });
  const published = await t.query(api.results.listRecentPublished, { editionId, limit: 10 });
  const eventResult = published.find(result => result.eventId === eventId);
  expect(eventResult?.entries.find(entry => entry.schoolId === schoolA)).toMatchObject({ participantName: "Asha" });
  expect(eventResult?.entries.find(entry => entry.schoolId === schoolB)?.participantName).toBeUndefined();
  expect(JSON.stringify(eventResult)).not.toContain("Legacy A");
  expect(JSON.stringify(eventResult)).not.toContain("Legacy B");

  const correctedRevisionId = await admin.mutation(api.results.saveDraft, {
    eventId,
    reason: "Correct participant name",
    expectedDraftVersion: 1,
    entries: [{ ...entries[0], displayParticipantName: "Asha B" }, entries[1]],
  });
  const correctionPreview = await admin.query(api.results.preview, { eventId, draftRevisionId: correctedRevisionId });
  expect(correctionPreview.changes.filter(change => change.delta !== 0)).toEqual([]);
  const correction = await admin.mutation(api.results.publish, { eventId, draftRevisionId: correctedRevisionId, expectedActiveRevisionId: correctionPreview.expectedActiveRevisionId, expectedDraftVersion: correctionPreview.expectedDraftVersion });
  expect(correction).toEqual({ status: "published" });
  const corrected = await t.query(api.results.listRecentPublished, { editionId, limit: 10 });
  expect(corrected.find(result => result.eventId === eventId)?.entries.find(entry => entry.schoolId === schoolA)).toMatchObject({ participantName: "Asha B" });
  await admin.query(api.results.getAdminByEvent, { eventId });


});