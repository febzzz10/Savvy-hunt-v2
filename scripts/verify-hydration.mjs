import assert from "node:assert/strict";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";

const baseURL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname));
const result = { startedAt: new Date().toISOString(), baseURL, checks: [], pageErrors: [], consoleErrors: [], failedResources: [], clerkDevelopmentWarning: false };
const browser = await chromium.launch({ channel: "msedge", headless: true });
let staff, announcementId, live;
try {
  const context = await browser.newContext();
  // Retain actual sockets so the test can trigger a real transport reconnect.
  await context.addInitScript(() => {
    const NativeWebSocket = window.WebSocket;
    window.__hydrationSockets = [];
    window.WebSocket = class extends NativeWebSocket {
      constructor(url, protocols) {
        super(url, protocols);
        if (String(url).includes(".convex.cloud")) window.__hydrationSockets.push(this);
      }
    };
  });
  const page = await context.newPage();
  page.on("response", response => {
    if (response.status() >= 400) result.failedResources.push({ path: new URL(response.url()).pathname, status: response.status() });
  });
  page.on("pageerror", error => result.pageErrors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") result.consoleErrors.push(message.text());
    if (/Clerk.*development keys/i.test(message.text())) result.clerkDevelopmentWarning = true;
  });
  const connected = () => page.getByRole("status").filter({ hasText: "Live updates connected" }).waitFor({ timeout: 30000 });
  for (const route of ["/", "/scoreboard", "/schedule"]) {
    const response = await page.goto(`${baseURL}${route}`);
    assert.equal(response.status(), 200);
    const markup = (await response.text()).match(/<div class="connection-status[^"]*" role="status"[^>]*>[^<]*<\/div>/)?.[0];
    assert.equal(markup, '<div class="connection-status disconnected" role="status" aria-live="polite" aria-atomic="true">Connecting to live updates…</div>');
    await connected();
    result.checks.push(`Fresh ${route}: stable SSR connecting snapshot hydrates and reaches a real connected state`);
  }
  await page.evaluate(() => { window.__hydrationNavigation = true; });
  for (const [name, route] of [["SAVVY HUNT", "/"], ["Scoreboard", "/scoreboard"], ["Schedule", "/schedule"]]) {
    await page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name, exact: true }).click();
    await page.waitForURL(`${baseURL}${route}`);
    await connected();
    assert.equal(await page.evaluate(() => window.__hydrationNavigation), true, "Navigation unexpectedly reloaded the document");
    result.checks.push(`Client-side navigation to ${route} preserves the live client without a document reload`);
  }
  await page.evaluate(() => {
    const status = document.querySelector(".connection-status");
    window.__hydrationStatusHistory = [status.textContent];
    new MutationObserver(() => window.__hydrationStatusHistory.push(status.textContent)).observe(status, { childList: true, subtree: true, characterData: true });
    for (const socket of window.__hydrationSockets) if (socket.readyState === WebSocket.OPEN) socket.close(1000, "Hydration regression reconnect test");
  });
  await page.waitForFunction(() => window.__hydrationStatusHistory.some(text => text.startsWith("Reconnecting")), undefined, { timeout: 10000 });
  await connected();
  result.connectionTransitions = await page.evaluate(() => window.__hydrationStatusHistory);
  result.checks.push("Real Convex socket closure renders reconnecting and automatically returns to connected");
  await context.setOffline(true);
  await page.getByRole("status").filter({ hasText: "Offline" }).waitFor({ timeout: 5000 });
  await context.setOffline(false);
  await connected();
  result.checks.push("Browser offline/online transitions remain accurate and recover without refresh");
  if (process.argv.includes("--live")) {
    live = await import("./phase4-support.mjs");
    staff = await live.verificationAdmin();
    const edition = await live.anonymous.query(live.api.editions.getCurrent, {});
    const title = `Hydration verification ${Date.now()}`;
    announcementId = await staff.client.mutation(live.api.announcements.save, { editionId: edition._id, title, body: "Temporary development subscription regression test" });
    await page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "SAVVY HUNT", exact: true }).click();
    await page.waitForURL(`${baseURL}/`);
    await connected();
    await staff.client.mutation(live.api.announcements.setStatus, { id: announcementId, status: "published" });
    await page.getByRole("heading", { name: title, exact: true }).waitFor();
    await staff.client.mutation(live.api.announcements.setStatus, { id: announcementId, status: "hidden" });
    await page.getByRole("heading", { name: title, exact: true }).waitFor({ state: "detached" });
    result.checks.push("Real development publication and hiding update an open Convex subscription without refresh");
  }
  assert.deepEqual(result.pageErrors, []);
  assert.deepEqual(result.consoleErrors.filter(text => /hydrat|React error|server rendered|didn't match/i.test(text)), []);
} catch (error) { result.failure = error.message; process.exitCode = 1; }
finally {
  if (staff) {
    if (announcementId) { await staff.refresh(); await staff.client.mutation(live.api.announcements.setStatus, { id: announcementId, status: "hidden" }); }
    await staff.close();
  }
  await browser.close();
  await mkdir("verification-evidence", { recursive: true });
  await writeFile("verification-evidence/hydration.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
}
