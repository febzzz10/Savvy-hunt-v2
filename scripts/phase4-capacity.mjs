import { ConvexClient } from "convex/browser";
import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { api, anonymous, verificationAdmin, evidence } from "./phase4-support.mjs";

const total = Number(process.env.VERIFY_CLIENTS ?? 500);
assert.ok(Number.isSafeInteger(total) && total >= 1 && total <= 500);
const result = { startedAt: new Date().toISOString(), target: "dev:quiet-chickadee-449", requestedClients: total, subscriptionsPerClient: 4, ramps: [], phases: [], errors: [], limitations: ["One load generator and development Convex; this is not Vercel, Drive image delivery, geographically distributed browsers or a sustained event-day soak."] };
const clients = [];
let admin, edition, schoolId, eventId, schoolName, expected = 0, changedAt = 0;
async function until(test, timeout = 45000) {
  const start = performance.now();
  while (!test()) {
    if (performance.now() - start > timeout) throw new Error("Timed out waiting for all development subscriptions");
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}
function stats(values) {
  const sorted = values.toSorted((a, b) => a - b), at = p => Math.round(sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] ?? 0);
  return { count: sorted.length, p50Ms: at(.5), p95Ms: at(.95), maxMs: Math.round(sorted.at(-1) ?? 0) };
}
try {
  admin = await verificationAdmin();
  edition = await anonymous.query(api.editions.getCurrent, {});
  const categories = await anonymous.query(api.categories.listCurrent, { editionId: edition._id });
  const stamp = Date.now();
  schoolName = `Phase 4 capacity school ${stamp}`;
  schoolId = await admin.client.mutation(api.schools.save, { editionId: edition._id, name: schoolName });
  eventId = await admin.client.mutation(api.events.save, { editionId: edition._id, title: `Phase 4 capacity event ${stamp}`, categoryId: categories[1]._id, startsAt: stamp, participatingSchoolIds: [schoolId] });
  for (const target of [...new Set([Math.min(50, total), Math.min(200, total), total])]) {
    const start = performance.now();
    while (clients.length < target) {
      const entry = { first: {}, latest: {}, observed: {}, sockets: [], createdAt: performance.now() };
      class TrackedSocket extends WebSocket {
        constructor(...args) { super(...args); entry.sockets.push(this); }
      }
      entry.client = new ConvexClient(process.env.NEXT_PUBLIC_CONVEX_URL, { webSocketConstructor: TrackedSocket, logger: false });
      const subscribe = (name, reference, args, select) => entry.client.onUpdate(reference, args, value => {
        const now = performance.now();
        entry.first[name] ??= now - entry.createdAt;
        entry.latest[name] = select(value);
        if (name === "overall" || name === "category") {
          if (entry.latest[name] === expected && changedAt) entry.observed[name] ??= now - changedAt;
        }
      }, error => result.errors.push({ query: name, message: error.message }));
      subscribe("overall", api.scoreboard.getOverall, { editionId: edition._id }, rows => rows.find(s => s.id === schoolId)?.points);
      subscribe("category", api.scoreboard.getCategory, { editionId: edition._id, categoryId: categories[1]._id }, rows => rows.find(s => s.id === schoolId)?.points);
      subscribe("events", api.events.listPublic, { editionId: edition._id }, rows => rows.length);
      subscribe("results", api.results.getPublishedByEvent, { eventId }, rows => rows.reduce((sum, row) => sum + row.points, 0));
      clients.push(entry);
      if (clients.length % 25 === 0) await new Promise(resolve => setTimeout(resolve, 150));
    }
    await until(() => clients.every(e => Object.keys(e.first).length === 4));
    const ramp = { clients: target, readyMs: Math.round(performance.now() - start), connected: clients.filter(e => e.client.connectionState().isWebSocketConnected).length };
    result.ramps.push(ramp); console.log(JSON.stringify({ ramp }));
  }
  result.initialSubscriptionLatency = stats(clients.map(e => Math.max(...Object.values(e.first))));
  async function publication(points, phase, disconnect = false) {
    await admin.refresh();
    const draftRevisionId = await admin.client.mutation(api.results.saveDraft, { eventId, entries: [{ schoolId, points }], reason: phase });
    const preview = await admin.client.query(api.results.preview, { eventId, draftRevisionId });
    const disrupted = disconnect ? clients.slice(0, Math.min(50, total)) : [];
    for (const entry of disrupted) entry.sockets.at(-1).close(1000, "Phase 4 reconnect rehearsal");
    expected = points; changedAt = performance.now();
    for (const entry of clients) entry.observed = {};
    await admin.client.mutation(api.results.publish, { eventId, draftRevisionId, expectedActiveRevisionId: preview.expectedActiveRevisionId, expectedDraftVersion: preview.expectedDraftVersion });
    await until(() => clients.every(e => e.latest.overall === points && e.latest.category === points && e.latest.results === points && Object.keys(e.observed).length === 2));
    if (disconnect) await until(() => disrupted.every(e => e.client.connectionState().connectionCount > 1));
    const record = { phase, points, receivedBy: clients.length, overall: stats(clients.map(e => e.observed.overall)), category: stats(clients.map(e => e.observed.category)), forcedSocketClosures: disrupted.length, reconnected: disrupted.filter(e => e.client.connectionState().connectionCount > 1).length };
    result.phases.push(record); console.log(JSON.stringify(record));
  }
  await publication(7, "Phase 4 capacity initial publication");
  await publication(4, "Phase 4 capacity correction with forced socket reconnect", true);
  await admin.refresh();
  const official = await admin.client.query(api.results.getAdminByEvent, { eventId });
  expected = 0; changedAt = performance.now();
  for (const entry of clients) entry.observed = {};
  await admin.client.mutation(api.results.revoke, { eventId, expectedActiveRevisionId: official.event.activePublishedRevisionId, reason: "Phase 4 capacity cleanup" });
  await until(() => clients.every(e => e.latest.overall === 0 && e.latest.category === 0 && e.latest.results === 0));
  result.phases.push({ phase: "revocation", receivedBy: clients.length, overall: stats(clients.map(e => e.observed.overall)) });
  result.finalConnected = clients.filter(e => e.client.connectionState().isWebSocketConnected).length;
  assert.equal(result.errors.length, 0);
} catch (error) { result.failure = error.message; console.error(error.message); }
finally {
  await Promise.allSettled(clients.map(e => e.client.close()));
  if (admin) {
    await admin.refresh();
    if (eventId) {
      const data = await admin.client.query(api.results.getAdminByEvent, { eventId });
      if (data.event.activePublishedRevisionId) await admin.client.mutation(api.results.revoke, { eventId, expectedActiveRevisionId: data.event.activePublishedRevisionId, reason: "Phase 4 capacity failure cleanup" });
      await admin.client.mutation(api.events.save, { editionId: edition._id, id: eventId, title: data.event.title, categoryId: data.event.categoryId, startsAt: data.event.startsAt, status: "cancelled" });
    }
    if (schoolId) await admin.client.mutation(api.schools.save, { editionId: edition._id, id: schoolId, name: schoolName, status: "archived" });
    await admin.close();
  }
  result.finishedAt = new Date().toISOString();
  await evidence("capacity", result);
  console.log(JSON.stringify(result, null, 2));
}
if (result.failure) process.exitCode = 1;
