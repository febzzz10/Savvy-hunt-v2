import assert from "node:assert/strict";
import { createClerkClient } from "@clerk/backend";
import { ConvexHttpClient } from "convex/browser";
import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mkdir, writeFile } from "node:fs/promises";
import { api } from "../convex/_generated/api.js";
process.loadEnvFile(".env.local");
assert.match(process.env.CONVEX_DEPLOYMENT ?? "", /^dev:quiet-chickadee-449(?:\s|$)/);
assert.match(process.env.CLERK_SECRET_KEY ?? "", /^sk_test_/);
const base = process.env.VERIFY_BASE_URL ?? "http://localhost:3100";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const result = { target: "dev:quiet-chickadee-449", workflow: "direct-drive-only", checks: [], errors: [], googleBlocker: null };
let browser, session;
try {
  for (const user of (await clerk.users.getUserList({ query: "savvy-verification-", limit: 30 })).data) {
    const candidate = await clerk.sessions.createSession({ userId: user.id });
    client.setAuth((await clerk.sessions.getToken(candidate.id, "convex")).jwt);
    if (await client.query(api.admins.getSelf, {})) { session = candidate; break; }
    await clerk.sessions.revokeSession(candidate.id);
  }
  assert.ok(session, "Existing development verification admin required; no users or roles were created");
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  context.setDefaultTimeout(30_000);
  const page = await context.newPage();
  page.on("pageerror", error => result.errors.push(error.message));
  const removedUpload = await context.request.post(`${base}/api/admin/gallery/upload`);
  assert.equal(removedUpload.status(), 404); result.checks.push("Removed website upload endpoint returns 404");
  await page.goto(`${base}/snapshots`);
  await page.getByRole("heading", { name: "Snapshots", exact: true }).waitFor();
  result.checks.push("Public reactive gallery loads");
  await page.goto(`${base}/admin/login`);
  await page.waitForFunction(() => Boolean(window.Clerk?.loaded));
  const ticket = await clerk.signInTokens.createSignInToken({ userId: session.userId, expiresInSeconds: 120 });
  await page.evaluate(async token => { const signIn = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: token }); await window.Clerk.setActive({ session: signIn.createdSessionId }); }, ticket.token);
  await page.goto(`${base}/admin/gallery`);
  await page.getByRole("heading", { name: "Gallery manager", exact: true }).waitFor();
  for (const name of ["Pending", "Approved", "Rejected"]) { await page.getByRole("button", { name, exact: true }).click(); await page.getByRole("heading", { name: `${name} photos`, exact: true }).waitFor(); }
  assert.equal(await page.getByRole("button", { name: "Upload", exact: true }).count(), 0);
  assert.equal(await page.locator('input[type="file"]').count(), 0);
  result.checks.push("Active Clerk admin retains Pending, Approved and Rejected views; no Upload tab or file picker");
  await page.getByRole("button", { name: "Sync Now", exact: true }).click();
  const edition = await client.query(api.editions.getCurrent, {});
  let state;
  for (let attempt = 0; attempt < 30; attempt++) {
    state = await client.query(api.gallerySyncData.getState, { editionId: edition._id });
    if (state && !state.running) break;
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  assert.ok(state && !state.running, "Sync did not finish within 30 seconds");
  result.googleBlocker = state.lastError ?? null;
  result.checks.push("Protected Sync Now completed and exposed its result reactively");
  if (result.googleBlocker) throw new Error(result.googleBlocker);
  result.sync = { imported: state.imported, checked: state.checked };
  let cursor = null, candidate;
  for (let attempt = 0; attempt < 20; attempt++) {
    const listing = await client.query(api.gallery.pageAdmin, { editionId: edition._id, paginationOpts: { numItems: 50, cursor } });
    candidate = listing.page.find(item => item.availability === "present" && item.observedMd5Checksum && item.approvalStatus === "pending" && !item.consentConfirmed);
    if (candidate || listing.isDone) break;
    cursor = listing.continueCursor;
  }
  if (candidate) {
    assert.equal(candidate.consentConfirmed, false);
    const publicImage = await context.request.get(`${base}/api/gallery/${candidate._id}/image`);
    assert.equal(publicImage.status(), 404);
    const [previewResponse] = await Promise.all([page.waitForResponse(response => response.url().includes(`/api/gallery/${candidate._id}/image?preview=true`)), page.goto(`${base}/admin/gallery`)]);
    assert.equal(previewResponse.status(), 200);
    assert.ok(previewResponse.headers()["content-type"]?.startsWith("image/"));
    assert.equal(previewResponse.headers()["cache-control"], "private, no-store");
    await page.getByRole("heading", { name: "Pending photos", exact: true }).waitFor();
    const editor = page.locator("article").filter({ has: page.locator(`img[src*="${candidate._id}"]`) });
    await editor.getByRole("button", { name: "Verify and publish", exact: true }).waitFor();
    assert.equal(await editor.getByRole("button", { name: "Verify and publish", exact: true }).isDisabled(), true);
    result.checks.push("Real Drive photo has Pending status and no consent, public image is blocked, private admin preview returns verified image bytes, publication stays disabled");
  } else result.checks.push("Drive sync passed; no new pending photo fixture was available for private preview");
  await mkdir("verification-evidence", { recursive: true });
  const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations;
  assert.deepEqual(violations.map(v => ({ id: v.id, impact: v.impact })), []);
  for (const [name, width] of [["desktop", 1440], ["mobile", 390]]) {
    await page.setViewportSize({ width, height: 1000 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `verification-evidence/gallery-${name}.png`, fullPage: true });
  }
  result.checks.push("Gallery manager passes axe WCAG checks and has no desktop/mobile overflow");
  await page.getByRole("button", { name: "Pending", exact: true }).click();
  await page.getByRole("heading", { name: "Pending photos", exact: true }).waitFor();
  await page.screenshot({ path: "verification-evidence/gallery-pending.png", fullPage: true });
  assert.deepEqual(result.errors, []); result.checks.push("No browser JavaScript errors");
} catch (error) { result.failure = error.message; process.exitCode = 1; }
finally {
  if (browser) await browser.close();
  if (session) await clerk.sessions.revokeSession(session.id);
  await mkdir("verification-evidence", { recursive: true });
  await writeFile("verification-evidence/gallery-drive-only.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
