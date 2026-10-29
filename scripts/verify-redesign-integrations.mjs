import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { baseURL, clerk, anonymous, api, verificationAdmin } from "./phase4-support.mjs";
const output = "verification-evidence/redesign/integrations";
await mkdir(output, { recursive: true });
const report = { checks: [], pages: [], limitations: [] };
let browser, admin, temporaryUser;
const sessions = [];
async function signIn(context, userId) {
  const page = await context.newPage();
  await page.goto(baseURL + "/admin/login");
  await page.waitForFunction(() => window.Clerk?.loaded, { timeout: 45000 });
  const ticket = await clerk.signInTokens.createSignInToken({ userId, expiresInSeconds: 120 });
  const sessionId = await page.evaluate(async token => {
    const result = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: token });
    await window.Clerk.setActive({ session: result.createdSessionId });
    return result.createdSessionId;
  }, ticket.token);
  sessions.push(sessionId);
  return page;
}
try {
  admin = await verificationAdmin();
  const edition = await anonymous.query(api.editions.getCurrent, {});
  assert.ok(edition);
  const categories = await anonymous.query(api.categories.listCurrent, { editionId: edition._id });
  const events = await anonymous.query(api.events.listPublic, { editionId: edition._id });
  const published = await anonymous.query(api.results.listRecentPublished, { editionId: edition._id, limit: 50 });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const visitor = await browser.newContext();
  const page = await visitor.newPage();
  for (const category of [null, ...categories]) {
    const expected = await anonymous.query(category ? api.scoreboard.getCategory : api.scoreboard.getOverall, category ? { editionId: edition._id, categoryId: category._id } : { editionId: edition._id });
    await page.goto(baseURL + "/scoreboard" + (category ? "/" + category.slug : ""));
    await page.locator(".rankings tbody tr").first().waitFor();
    const actual = await page.locator(".rankings tbody tr").evaluateAll(rows => rows.map(row => ({
      name: row.querySelector("th").textContent,
      points: Number(row.querySelector(".points").textContent),
      rank: Number(row.querySelector(".rank-number").textContent),
    })));
    assert.deepEqual(actual, expected.map(({ name, points, rank }) => ({ name, points, rank })));
    report.checks.push((category?.name ?? "Overall") + ": displayed names, points, order and tied ranks match live Convex query");
  }
  await page.goto(baseURL + "/results");
  await page.locator(".skeleton").first().waitFor({ state: "hidden" });
  assert.equal(await page.locator(".result-sheet").count(), published.length);
  for (const result of published) {
    const article = page.locator(".result-sheet").filter({ has: page.getByRole("heading", { name: result.eventTitle + " ↗", exact: true }) });
    assert.equal(await article.locator("tbody tr").count(), result.entries.length);
  }
  report.checks.push("Public result blocks and entries match the published-only backend query");
  await page.goto(baseURL + "/schedule");
  await page.locator(".programme-row").first().waitFor();
  assert.equal(await page.locator(".programme-row").count(), events.length);
  await visitor.setOffline(true);
  await page.locator(".connection-status").filter({ hasText: /Offline|Reconnecting/ }).waitFor();
  await page.screenshot({ path: output + "/offline-schedule.png", fullPage: true });
  await visitor.setOffline(false);
  await page.locator(".connection-status").filter({ hasText: "Live updates connected" }).waitFor({ timeout: 45000 });
  report.checks.push("Schedule uses all real events; offline warning and reconnect recovery work without refresh");
  const photos = await anonymous.query(api.gallery.listApproved, { editionId: edition._id });
  await page.goto(baseURL + "/snapshots");
  await page.locator(".skeleton").first().waitFor({ state: "hidden" });
  if (!photos.length) report.limitations.push("No approved live photographs: live hero/photo lightbox and successful Drive image response cannot be exercised without changing consent/approval data.");
  else {
    const tile = page.getByRole("button", { name: /^Open photograph:/ }).first();
    await tile.click();
    await page.getByRole("dialog").waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await tile.evaluate(el => document.activeElement === el), true);
    report.checks.push("Approved photo lightbox opens, closes with Escape and restores focus");
  }
  const deniedImage = await visitor.request.get(baseURL + "/api/gallery/not-an-item/image?preview=true");
  assert.equal(deniedImage.status(), 401);
  report.checks.push("Anonymous private image preview is denied");
  const staff = await browser.newContext();
  const staffPage = await signIn(staff, admin.user.id);
  const routes = ["/admin", "/admin/events", "/admin/schools", "/admin/scoreboard", "/admin/announcements", "/admin/gallery", "/admin/settings", "/admin/admins", "/admin/audit", "/admin/setup", "/admin/request-access", ...(events[0] ? ["/admin/events/" + events[0]._id + "/results"] : [])];
  for (const width of [390, 1440]) {
    await staffPage.setViewportSize({ width, height: 1000 });
    for (const route of routes) {
      const errors = [];
      const listener = e => errors.push(e.message);
      staffPage.on("pageerror", listener);
      await staffPage.goto(baseURL + route);
      await staffPage.waitForFunction(() => {
        const main = document.querySelector("main");
        return main && !/Checking admin access|Connecting to live event data|Loading (?:official|gallery|event|result|audit)/i.test(main.textContent);
      }, undefined, { timeout: 45000 });
      await staffPage.waitForTimeout(600);
      const violations = (await new AxeBuilder({ page: staffPage }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target), details: v.nodes.map(n => n.failureSummary) }));
      const overflow = await staffPage.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      report.pages.push({ route, width, errors, violations, overflow });
      console.log(JSON.stringify({ route, width, errors, violations: violations.map(v => v.id), overflow }));
      await staffPage.screenshot({ path: output + "/" + route.slice(1).replaceAll("/", "-") + "-" + width + ".png", fullPage: true });
      staffPage.off("pageerror", listener);
    }
  }
  report.checks.push("Real Clerk ticket sign-in reaches allowlisted organizer pages through Convex");
  temporaryUser = await clerk.users.createUser({ emailAddress: ["savvy-redesign-" + Date.now() + "+clerk_test@example.com"], password: randomBytes(32).toString("base64url"), firstName: "Temporary unlisted verification" });
  const unlisted = await browser.newContext();
  const deniedPage = await signIn(unlisted, temporaryUser.id);
  await deniedPage.goto(baseURL + "/admin");
  await deniedPage.getByRole("heading", { name: "Access denied", exact: true }).waitFor();
  assert.equal(await deniedPage.getByRole("heading", { name: "Event control" }).count(), 0);
  await deniedPage.screenshot({ path: output + "/admin-unauthorized.png", fullPage: true });
  report.checks.push("Signed-in unlisted account sees access denied, with no protected dashboard");
} catch (error) { report.failure = error.message; console.error(error.message); }
finally {
  if (browser) await browser.close();
  for (const id of sessions) await clerk.sessions.revokeSession(id).catch(() => {});
  if (temporaryUser) await clerk.users.deleteUser(temporaryUser.id);
  if (admin) await admin.close();
  await writeFile(output + "/checks.json", JSON.stringify(report, null, 2));
}
assert.ok(!report.failure && report.pages.every(p => !p.errors.length && !p.violations.length && !p.overflow), "Integration verification failed; inspect checks.json");
console.log(JSON.stringify(report.checks));

