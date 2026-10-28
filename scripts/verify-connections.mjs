import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { api, anonymous, baseURL, clerk, verificationAdmin } from "./phase4-support.mjs";

// Uses an existing, unpublished development verification fixture. Never targets production.
const result = { startedAt: new Date().toISOString(), checks: [], errors: [], sockets: [], auth: [] };
let browser, admin, event, publishedRevision, eventChanged = false;
let browserSession;
const check = message => { result.checks.push(message); console.log(message); };
const live = page => page.locator(".connection-status").filter({ hasText: "Live updates connected" }).waitFor({ timeout: 45000 });
const score = (page, name, points) => page.getByRole("row").filter({ hasText: name }).getByRole("cell", { name: String(points), exact: true }).waitFor({ timeout: 45000 });

async function watch(context) {
  // Retain native sockets only to simulate a broken connection; the SDK handles all retries.
  await context.addInitScript(() => {
    window.__connectionTest = { sockets: [], states: [] };
    const NativeSocket = window.WebSocket;
    window.WebSocket = class extends NativeSocket {
      constructor(...args) {
        super(...args);
        if (String(args[0]).includes("convex.cloud")) window.__connectionTest.sockets.push(this);
      }
    };
    new MutationObserver(() => {
      const text = document.querySelector(".connection-status")?.textContent;
      const states = window.__connectionTest.states;
      if (text && states.at(-1) !== text) states.push(text);
    }).observe(document, { childList: true, subtree: true, characterData: true });
  });
  context.on("page", page => {
    page.on("pageerror", error => result.errors.push(error.message));
    page.on("websocket", socket => {
      if (!socket.url().includes("convex.cloud")) return;
      const entry = { page: page.url(), url: socket.url(), openedAt: Date.now(), messages: {} };
      result.sockets.push(entry);
      socket.on("framereceived", frame => {
        try {
          const { type } = JSON.parse(String(frame.payload));
          entry.messages[type] = (entry.messages[type] ?? 0) + 1;
        } catch { /* Binary/non-JSON diagnostic frames carry no evidence here. */ }
      });
      socket.on("framesent", frame => {
        try {
          const message = JSON.parse(String(frame.payload));
          if (message.type !== "Authenticate" || !message.value) return;
          const { iat, exp, aud, iss } = JSON.parse(Buffer.from(message.value.split(".")[1], "base64url").toString());
          result.auth.push({ iat, exp, aud, iss, sentAt: Date.now() });
        } catch { /* Never persist raw auth frames or tokens. */ }
      });
      socket.on("close", () => { entry.closedAt = Date.now(); });
    });
  });
}

async function saveEvent(venue) {
  await admin.refresh();
  await admin.client.mutation(api.events.save, {
    id: event._id, editionId: event.editionId, categoryId: event.categoryId,
    title: event.title, startsAt: event.startsAt, endsAt: event.endsAt,
    participatingSchoolIds: event.participatingSchoolIds, description: event.description,
    status: event.status, venue,
  });
}

async function publish(points) {
  await admin.refresh();
  const draftRevisionId = await admin.client.mutation(api.results.saveDraft, {
    eventId: event._id, reason: "Temporary development reconnect verification",
    entries: [{ schoolId: event.participatingSchoolIds[0], points }],
  });
  const preview = await admin.client.query(api.results.preview, { eventId: event._id, draftRevisionId });
  await admin.client.mutation(api.results.publish, {
    eventId: event._id, draftRevisionId,
    expectedActiveRevisionId: preview.expectedActiveRevisionId,
    expectedDraftVersion: preview.expectedDraftVersion,
  });
  publishedRevision = draftRevisionId;
}

try {
  admin = await verificationAdmin();
  const edition = await anonymous.query(api.editions.getCurrent, {});
  const candidates = await admin.client.query(api.events.listAdmin, { editionId: edition._id });
  for (const candidate of candidates.filter(e => /^Verification Quiz \d+$/.test(e.title) && !e.activePublishedRevisionId && e.participatingSchoolIds?.length)) {
    const detail = await admin.client.query(api.results.getAdminByEvent, { eventId: candidate._id });
    if (!detail.draft) { event = candidate; break; }
  }
  assert.ok(event, "An unpublished Verification Quiz fixture without a draft is required");
  const school = (await anonymous.query(api.scoreboard.getOverall, { editionId: edition._id })).find(row => row.id === event.participatingSchoolIds[0]);
  assert.ok(school);
  const category = (await anonymous.query(api.categories.listCurrent, { editionId: edition._id })).find(row => row._id === event.categoryId);
  assert.ok(category);
  result.target = process.env.CONVEX_DEPLOYMENT;
  result.fixture = { eventId: event._id, schoolId: school.id };
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const viewers = await Promise.all([browser.newContext(), browser.newContext()]);
  const staff = await browser.newContext();
  for (const context of [...viewers, staff]) { context.setDefaultTimeout(45000); await watch(context); }

  const adminPage = await staff.newPage();
  await adminPage.goto(`${baseURL}/admin/login`);
  await adminPage.getByRole("textbox").first().waitFor();
  await adminPage.waitForFunction(() => window.Clerk?.loaded);
  const ticket = await clerk.signInTokens.createSignInToken({ userId: admin.user.id, expiresInSeconds: 120 });
  await adminPage.evaluate(async value => {
    const signIn = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: value });
    await window.Clerk.setActive({ session: signIn.createdSessionId });
  }, ticket.token);
  browserSession = await adminPage.evaluate(() => window.Clerk.session.id);
  await adminPage.goto(`${baseURL}/admin/events`);
  await adminPage.getByRole("heading", { name: "Events", exact: true }).waitFor();
  await live(adminPage);
  check("Clerk login UI loads; real development Clerk session reaches the Convex-protected admin page");
  const initialExpiry = Math.max(...result.auth.map(token => token.exp));
  assert.ok(Number.isFinite(initialExpiry), "An authenticated Convex WebSocket frame must be observed");

  const groups = [];
  for (const context of viewers) {
    const pages = {};
    for (const [key, route] of Object.entries({ home: "/", overall: "/scoreboard", category: `/scoreboard/${category.slug}`, event: `/events/${event.slug}`, schedule: "/schedule" })) {
      const page = await context.newPage();
      pages[key] = page;
      await page.goto(`${baseURL}${route}`);
      await live(page);
    }
    await score(pages.overall, school.name, school.points);
    await score(pages.category, school.name, (await anonymous.query(api.scoreboard.getCategory, { editionId: edition._id, categoryId: category._id })).find(row => row.id === school.id).points);
    await pages.home.getByRole("heading", { name: "Live now", exact: true }).waitFor();
    await pages.event.getByRole("heading", { name: event.title, exact: true }).waitFor();
    await pages.schedule.getByRole("heading", { name: event.title, exact: true }).waitFor();
    groups.push(pages);
  }
  check("Homepage, school standings, category standings, schedule and event detail load in two isolated browser sessions");

  const navigationPage = groups[0].overall;
  const beforeNavigation = await navigationPage.evaluate(() => window.__connectionTest.sockets.length);
  await navigationPage.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Schedule", exact: true }).click();
  await navigationPage.getByRole("heading", { name: "Event schedule", exact: true }).waitFor();
  await navigationPage.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Scoreboard", exact: true }).click();
  await score(navigationPage, school.name, school.points);
  assert.equal(await navigationPage.evaluate(() => window.__connectionTest.sockets.length), beforeNavigation);
  check("Client-side navigation reuses the existing Convex WebSocket");

  const denied = await viewers[0].newPage();
  await denied.goto(`${baseURL}/admin`);
  await denied.getByRole("heading", { name: "Admin sign in required" }).waitFor();
  await denied.close();
  check("Anonymous browser is refused admin access");
  await publish(17);
  for (const pages of groups) {
    await score(pages.overall, school.name, school.points + 17);
    await score(pages.category, school.name, 17);
    await score(pages.event, school.name, 17);
    await pages.home.getByText(`${school.points + 17} points`, { exact: true }).first().waitFor();
  }
  check("Published scores reach both sessions' overall, category, event and home views without reload");

  // Record the transient reconnecting state while the browser still reports online.
  await groups[1].overall.evaluate(() => window.__connectionTest.sockets.at(-1).close(4000, "Temporary verification disconnect"));
  await groups[1].overall.waitForFunction(() => window.__connectionTest.states.some(text => text.startsWith("Reconnecting")));
  await live(groups[1].overall);
  check("An actual socket disconnect is announced as reconnecting and the SDK reconnects automatically");

  await viewers[1].setOffline(true);
  for (const page of Object.values(groups[1])) {
    await page.evaluate(() => window.__connectionTest.sockets.forEach(socket => socket.close(4000, "Temporary verification outage")));
    await page.locator(".connection-status").filter({ hasText: "Offline" }).waitFor();
  }
  await publish(23);
  const venue = `Reconnect verification ${Date.now()}`;
  eventChanged = true;
  await saveEvent(venue);
  await score(groups[0].overall, school.name, school.points + 23);
  await groups[0].schedule.getByText(venue, { exact: true }).waitFor();
  assert.equal(await groups[1].overall.getByRole("row").filter({ hasText: school.name }).getByRole("cell").last().innerText(), String(school.points + 17));
  check("Offline session retains stale results with a warning while the online session receives new scores and schedule data");
  await viewers[1].setOffline(false);
  for (const pages of groups) {
    await live(pages.overall);
    await score(pages.overall, school.name, school.points + 23);
    await score(pages.category, school.name, 23);
    await score(pages.event, school.name, 23);
    await pages.schedule.getByText(venue, { exact: true }).waitFor();
    await pages.event.getByText(new RegExp(venue)).waitFor();
    await pages.home.getByText(`${school.points + 23} points`, { exact: true }).first().waitFor();
  }
  result.statusHistory = await groups[1].overall.evaluate(() => window.__connectionTest.states);
  check("After network recovery, all five views receive data changed during the outage without reload");

  // Observe SDK-driven token renewal, not a manual getToken call.
  const deadline = Date.now() + 90000;
  while (!result.auth.some(token => token.exp > initialExpiry)) {
    assert.ok(Date.now() < deadline, "No automatically refreshed Convex auth token observed within 90 seconds");
    await adminPage.waitForTimeout(1000);
  }
  await adminPage.reload();
  await adminPage.getByRole("heading", { name: "Events", exact: true }).waitFor();
  assert.ok(result.auth.every(token => token.aud === "convex" && token.iss === process.env.CLERK_JWT_ISSUER_DOMAIN));
  check("SDK automatically sends a later-expiring Clerk convex JWT and protected admin access remains valid");
  assert.deepEqual(result.errors, []);
} catch (error) {
  result.failure = error.message;
  process.exitCode = 1;
} finally {
  try {
    if (admin) await admin.refresh();
    if (publishedRevision) await admin.client.mutation(api.results.revoke, { eventId: event._id, expectedActiveRevisionId: publishedRevision, reason: "Development reconnect verification cleanup" });
    if (eventChanged) await saveEvent(event.venue);
    if (event) {
      const restored = await admin.client.query(api.results.getAdminByEvent, { eventId: event._id });
      assert.equal(restored.event.activePublishedRevisionId, undefined);
      assert.equal(restored.event.venue, event.venue);
      check("Temporary result publication revoked and fixture venue restored; audit history retained");
    }
    if (browserSession) await clerk.sessions.revokeSession(browserSession);
  } catch (error) { result.cleanupFailure = error.message; process.exitCode = 1; }
  if (browser) await browser.close();
  if (admin) await admin.close();
  result.finishedAt = new Date().toISOString();
  await writeFile("verification-evidence/connections.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ checks: result.checks, failure: result.failure, cleanupFailure: result.cleanupFailure, errors: result.errors, authFrames: result.auth.length }, null, 2));
}
