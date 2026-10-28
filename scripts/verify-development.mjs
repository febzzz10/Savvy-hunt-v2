import { createClerkClient } from "@clerk/backend";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { randomBytes } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";

process.loadEnvFile(".env.local");
assert.match(process.env.CONVEX_DEPLOYMENT ?? "", /^dev:quiet-chickadee-449/);
assert.match(process.env.CLERK_SECRET_KEY ?? "", /^sk_test_/);
const evidence = { target: "dev:quiet-chickadee-449", startedAt: new Date().toISOString(), checks: [], errors: [] };
const record = message => { evidence.checks.push(message); console.log(message); };
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const anonymous = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const stamp = Date.now();
const temporaryUsers = [], temporarySessions = [];
let browser, session, adminPage, bootstrapSet = false, stage = "create Clerk verification user";
function convexEnv(command, ...args) {
  const result = spawnSync("cmd.exe", ["/c", "npx.cmd", "convex", "env", command, ...args], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(`Convex env ${command} failed`);
}
try {
  stage = "ensure development Clerk convex JWT template";
  const templates = await clerk.jwtTemplates.list({ limit: 100 });
  if (!templates.data.some(template => template.name === "convex")) {
    await clerk.jwtTemplates.create({ name: "convex", claims: { aud: "convex" }, lifetime: 60 });
    record("Created missing convex JWT template in Clerk test instance");
  }
  stage = "find previous verification admin or create Clerk verification user";
  let user;
  for (const candidate of (await clerk.users.getUserList({ query: "savvy-verification-", limit: 30 })).data) {
    const candidateSession = await clerk.sessions.createSession({ userId: candidate.id });
    client.setAuth((await clerk.sessions.getToken(candidateSession.id, "convex")).jwt);
    if (await client.query(api.admins.getSelf, {})) { user = candidate; session = candidateSession; break; }
    await clerk.sessions.revokeSession(candidateSession.id);
  }
  user ??= await clerk.users.createUser({ emailAddress: [`savvy-verification-${stamp}+clerk_test@example.com`], password: randomBytes(24).toString("base64url"), firstName: "Savvy Verification" });
  stage = "create Clerk verification session";
  session ??= await clerk.sessions.createSession({ userId: user.id });
  stage = "mint Clerk Convex JWT";
  async function authenticate() { client.setAuth((await clerk.sessions.getToken(session.id, "convex")).jwt); }
  await authenticate();
  stage = "verify Clerk JWT against Convex";
  const identityKey = await client.query(api.admins.getIdentityKey, {});
  assert.ok(identityKey);
  record("Real Clerk convex-template JWT accepted by development Convex");
  if (!await client.query(api.admins.getSelf, {})) {
    const secret = randomBytes(32).toString("hex");
    convexEnv("set", "ADMIN_BOOTSTRAP_SECRET", secret); bootstrapSet = true;
    await client.mutation(api.admins.bootstrap, { secret, displayName: "Verification Super Admin" });
    convexEnv("remove", "ADMIN_BOOTSTRAP_SECRET"); bootstrapSet = false;
  }
  const edition = await client.query(api.editions.getCurrent, {});
  const editionId = edition?._id ?? await client.mutation(api.editions.initialize, { name: `Verification ${stamp}`, year: 2026 });
  record("Development admin and six-category edition ready");
  for (const previous of await client.query(api.events.listAdmin, { editionId })) {
    if (/^Verification (Quiz|concurrency) \d+$/.test(previous.title) && previous.activePublishedRevisionId) {
      await client.mutation(api.results.revoke, { eventId: previous._id, expectedActiveRevisionId: previous.activePublishedRevisionId, reason: "Clear interrupted verification result before retry" });
    }
  }
  await assert.rejects(anonymous.mutation(api.schools.save, { editionId, name: "Unauthorized verification" }));
  record("Anonymous live mutation rejected");

  browser = await chromium.launch({ channel: "msedge", headless: true });
  const adminContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const admin = await adminContext.newPage();
  adminPage = admin;
  adminContext.setDefaultTimeout(20000);
  admin.on("pageerror", error => evidence.errors.push(error.message));
  await admin.goto("http://localhost:3000/admin/login");
  await admin.waitForFunction(() => Boolean(window.Clerk?.loaded), { timeout: 45000 });
  const ticket = await clerk.signInTokens.createSignInToken({ userId: user.id, expiresInSeconds: 120 });
  await admin.evaluate(async token => { const signIn = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: token }); await window.Clerk.setActive({ session: signIn.createdSessionId }); }, ticket.token);
  await admin.goto("http://localhost:3000/admin/schools");
  await admin.getByRole("heading", { name: "Schools", exact: true }).waitFor();
  const schoolA = `Verification A ${stamp}`, schoolB = `Verification B ${stamp}`;
  for (const name of [schoolA, schoolB]) {
    await admin.getByLabel("Name", { exact: true }).fill(name);
    await admin.getByRole("button", { name: "Add school", exact: true }).click();
    await admin.getByRole("heading", { name, exact: true }).waitFor();
  }
  record("Real admin browser created two schools through UI");
  stage = "create event through admin UI";
  await admin.goto("http://localhost:3000/admin/events");
  await admin.getByLabel("Title", { exact: true }).fill(`Verification Quiz ${stamp}`);
  const categories = await client.query(api.categories.listCurrent, { editionId });
  await admin.getByLabel("Category", { exact: true }).selectOption(categories[1]._id);
  await admin.getByLabel("Start date and time (Asia/Kolkata)", { exact: true }).fill("2026-11-01T10:00");
  await admin.getByLabel(schoolA, { exact: true }).check(); await admin.getByLabel(schoolB, { exact: true }).check();
  await admin.getByRole("button", { name: "Create event", exact: true }).click();
  await admin.getByRole("heading", { name: `Verification Quiz ${stamp}`, exact: true }).waitFor();
  await authenticate();
  const events = await client.query(api.events.listAdmin, { editionId });
  const event = events.find(item => item.title === `Verification Quiz ${stamp}`);
  const schools = await client.query(api.schools.listAdmin, { editionId });
  const a = schools.find(item => item.name === schoolA)._id, b = schools.find(item => item.name === schoolB)._id;
  record("Real admin browser created categorized event with participating schools");
  stage = "live role authorization";
  for (const role of ["regular", "editor", "revoked"]) {
    const roleUser = await clerk.users.createUser({ emailAddress: [`savvy-${role}-${stamp}+clerk_test@example.com`], password: randomBytes(24).toString("base64url"), firstName: "Verification" });
    temporaryUsers.push(roleUser.id);
    const roleSession = await clerk.sessions.createSession({ userId: roleUser.id }); temporarySessions.push(roleSession.id);
    const roleClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    roleClient.setAuth((await clerk.sessions.getToken(roleSession.id, "convex")).jwt);
    const key = await roleClient.query(api.admins.getIdentityKey, {});
    await authenticate();
    if (role !== "regular") await client.mutation(api.admins.save, { authUserId: key, displayName: `Verification ${role}`, role: role === "editor" ? "editor" : "super_admin", isActive: role !== "revoked" });
    if (role === "editor") {
      await roleClient.query(api.schools.listAdmin, { editionId });
      await assert.rejects(roleClient.query(api.admins.listAudit, {}));
      await assert.rejects(roleClient.mutation(api.results.revoke, { eventId: event._id, reason: "Must be denied", expectedActiveRevisionId: null }));
      await client.mutation(api.admins.save, { authUserId: key, displayName: "Verification editor", role: "editor", isActive: false });
    } else {
      await assert.rejects(roleClient.mutation(api.schools.save, { editionId, name: "Must be denied" }));
      await assert.rejects(roleClient.query(api.results.getAdminByEvent, { eventId: event._id }));
    }
  }
  record("Real Clerk regular, editor, and revoked identities obey backend roles");
  stage = "draft result through admin UI";
  await admin.goto(`http://localhost:3000/admin/events/${event._id}/results`);
  for (const [id, points] of [[a, "10"], [b, "6"]]) {
    await admin.getByRole("button", { name: "Add result row" }).click();
    await admin.getByLabel("School", { exact: true }).last().selectOption(id);
    await admin.getByLabel("Manual points", { exact: true }).last().fill(points);
  }
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin.getByRole("heading", { name: "Publication preview" }).waitFor();
  assert.equal((await anonymous.query(api.scoreboard.getOverall, { editionId })).find(row => row.id === a).points, 0);
  record("UI draft persisted, public total remained zero");
  stage = "publish result and observe anonymous browsers";
  const contexts = await Promise.all([browser.newContext(), browser.newContext({ viewport: { width: 390, height: 844 } })]);
  const viewers = await Promise.all(contexts.map(context => context.newPage()));
  const categoryPages = await Promise.all(contexts.map(context => context.newPage()));
  const eventPages = await Promise.all(contexts.map(context => context.newPage()));
  const homePages = await Promise.all(contexts.map(context => context.newPage()));
  await Promise.all(viewers.map(page => page.goto("http://localhost:3000/scoreboard")));
  await Promise.all(categoryPages.map(page => page.goto(`http://localhost:3000/scoreboard/${categories[1].slug}`)));
  await Promise.all(eventPages.map(page => page.goto(`http://localhost:3000/events/${event.slug}`)));
  await Promise.all(homePages.map(page => page.goto("http://localhost:3000/")));
  await Promise.all(viewers.map(page => page.getByRole("row").filter({ hasText: schoolA }).waitFor()));
  admin.on("dialog", dialog => dialog.accept());
  await admin.getByRole("button", { name: "Publish official results" }).click();
  for (const page of viewers) await page.getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "10", exact: true }).waitFor();
  for (const page of categoryPages) await page.getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "10", exact: true }).waitFor();
  for (const page of eventPages) await page.getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "10", exact: true }).waitFor();
  for (const page of homePages) await page.locator(".card").filter({ hasText: schoolA }).getByText("10 points", { exact: true }).waitFor();
  record("Category standings, event results, and homepage top three updated in both anonymous sessions");
  record("Publication updated two separate anonymous browsers without navigation or refresh");
  stage = "correct result through admin UI";
  await admin.getByLabel("Correction or revocation reason").fill("Verification judge correction");
  await admin.getByLabel("Manual points").first().fill("8");
  await admin.getByRole("button", { name: "Save draft", exact: true }).click();
  await admin.getByRole("button", { name: "Publish official results" }).click();
  for (const page of viewers) await page.getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "8", exact: true }).waitFor();
  for (const page of categoryPages) await page.getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "8", exact: true }).waitFor();
  record("Correction updated both anonymous browsers to 8 without double-counting");
  stage = "revoke result and reconnect anonymous browser";
  await contexts[1].setOffline(true);
  await admin.getByLabel("Correction or revocation reason").fill("Verification withdrawal");
  await admin.getByRole("button", { name: "Revoke official result" }).click();
  await viewers[0].getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "0", exact: true }).waitFor();
  await contexts[1].setOffline(false);
  await viewers[1].getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "0", exact: true }).waitFor();
  for (const page of categoryPages) await page.getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "0", exact: true }).waitFor();
  for (const page of eventPages) await page.getByText("Results pending.", { exact: true }).waitFor();
  record("Revocation propagated; disconnected browser recovered to current totals");
  stage = "live concurrent publication and stale preview checks";
  await authenticate();
  const raceEvent = await client.mutation(api.events.save, { editionId, categoryId: categories[1]._id, title: `Verification concurrency ${stamp}`, startsAt: Date.now() });
  const raceDraft = await client.mutation(api.results.saveDraft, { eventId: raceEvent, entries: [{ schoolId: a, points: 4 }] });
  const raceArgs = { eventId: raceEvent, draftRevisionId: raceDraft, expectedActiveRevisionId: null, expectedDraftVersion: 1 };
  const outcomes = await Promise.all([client.mutation(api.results.publish, raceArgs), client.mutation(api.results.publish, raceArgs)]);
  assert.deepEqual(outcomes.map(outcome => outcome.status).sort(), ["already_published", "published"]);
  assert.equal((await anonymous.query(api.scoreboard.getOverall, { editionId })).find(row => row.id === a).points, 4);
  await assert.rejects(client.mutation(api.results.revoke, { eventId: raceEvent, reason: "Stale withdrawal must fail", expectedActiveRevisionId: null }));
  const revisedDraft = await client.mutation(api.results.saveDraft, { eventId: raceEvent, reason: "Concurrency verification", entries: [{ schoolId: a, points: 5 }] });
  const stalePreview = await client.query(api.results.preview, { eventId: raceEvent, draftRevisionId: revisedDraft });
  await client.mutation(api.results.saveDraft, { eventId: raceEvent, expectedDraftVersion: stalePreview.expectedDraftVersion, reason: "Concurrency verification revised", entries: [{ schoolId: a, points: 6 }] });
  await assert.rejects(client.mutation(api.results.publish, { eventId: raceEvent, draftRevisionId: revisedDraft, expectedActiveRevisionId: stalePreview.expectedActiveRevisionId, expectedDraftVersion: stalePreview.expectedDraftVersion }));
  await assert.rejects(client.mutation(api.results.saveDraft, { eventId: raceEvent, entries: [{ schoolId: a, points: 99 }] }));
  await client.mutation(api.results.revoke, { eventId: raceEvent, reason: "Verification cleanup", expectedActiveRevisionId: raceDraft });
  for (const page of viewers) await page.getByRole("row").filter({ hasText: schoolA }).getByRole("cell", { name: "0", exact: true }).waitFor();
  record("Live simultaneous publication counted once; stale publication and omitted draft version rejected");
  evidence.adminUi = [];
  for (const width of [1440, 390]) {
    await admin.setViewportSize({ width, height: 1000 });
    for (const route of ["/admin/schools", "/admin/events", "/admin/gallery"]) {
      await admin.goto(`http://localhost:3000${route}`);
      await admin.getByRole("heading", { level: 1 }).waitFor();
      const violations = (await new AxeBuilder({ page: admin }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map(item => ({ id: item.id, impact: item.impact, nodes: item.nodes.map(node => node.target) }));
      const overflow = await admin.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      evidence.adminUi.push({ width, route, violations, overflow });
    }
  }
  assert.ok(evidence.adminUi.every(item => !item.overflow && !item.violations.length), "Admin accessibility or overflow issue");
  record("Desktop and mobile school, event, and gallery admin screens passed axe WCAG scan and overflow checks");
  await mkdir("verification-evidence", { recursive: true });
  await viewers[0].screenshot({ path: "verification-evidence/scoreboard-desktop.png", fullPage: true });
  await viewers[1].screenshot({ path: "verification-evidence/scoreboard-mobile.png", fullPage: true });
  evidence.fixture = { editionId, eventId: event._id, schoolA: a, schoolB: b };
  assert.deepEqual(evidence.errors, []);
} catch (error) {
  evidence.failure = `${stage}: ${error.message}`;
  console.error(`Verification failed at ${stage}: ${error.message}; codes: ${error.errors?.map(item => item.code).join(",") ?? "none"}`);
  if (adminPage) { await mkdir("verification-evidence", { recursive: true }); await adminPage.screenshot({ path: "verification-evidence/admin-failure.png", fullPage: true }).catch(() => {}); evidence.pageText = await adminPage.locator("body").innerText().catch(() => "Unavailable"); }
  process.exitCode = 1;
} finally {
  if (bootstrapSet) convexEnv("remove", "ADMIN_BOOTSTRAP_SECRET");
  if (session) await clerk.sessions.revokeSession(session.id).catch(() => {});
  for (const id of temporarySessions) await clerk.sessions.revokeSession(id).catch(() => {});
  for (const id of temporaryUsers) await clerk.users.deleteUser(id).catch(() => {});
  if (browser) await browser.close();
  evidence.finishedAt = new Date().toISOString();
  await mkdir("verification-evidence", { recursive: true });
  await writeFile("verification-evidence/development.json", JSON.stringify(evidence, null, 2));
}
