import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { baseURL, clerk, verificationAdmin } from "./phase4-support.mjs";

// Uses the existing development-only verification identity. No event/result writes.
const output = "verification-evidence/event-manager";
await mkdir(output, { recursive: true });
const report = { pages: [], checks: [], errors: [] };
let browser, admin, sessionId;
try {
  admin = await verificationAdmin();
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", error => report.errors.push(error.message));
  await page.goto(baseURL + "/admin/login");
  await page.waitForFunction(() => window.Clerk?.loaded, { timeout: 45000 });
  const ticket = await clerk.signInTokens.createSignInToken({ userId: admin.user.id, expiresInSeconds: 120 });
  sessionId = await page.evaluate(async token => {
    const result = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: token });
    await window.Clerk.setActive({ session: result.createdSessionId });
    return result.createdSessionId;
  }, ticket.token);
  await page.goto(baseURL + "/admin/events");
  await page.getByRole("heading", { name: "Event feed", exact: true }).waitFor({ timeout: 45000 });
  for (const width of [320, 375, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    report.pages.push({ width, overflow, violations: violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
    await page.screenshot({ path: `${output}/events-${width}.png`, fullPage: true });
    assert.equal(overflow, false);
    assert.equal(violations.length, 0, JSON.stringify(report.pages.at(-1)));
  }
  await page.getByRole("searchbox", { name: "Search events" }).fill("no-matching-event-qa-290ct");
  await expect(page.getByRole("heading", { name: "No matching events" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  report.checks.push("Search and clear filters use real subscribed events");
  const trigger = page.getByRole("button", { name: /Enter winners|Manage winners/ }).first();
  if (await trigger.count()) {
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Publish winners" });
    await dialog.getByRole("heading", { name: "Official score impact" }).waitFor();
    for (const width of [375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations;
      report.pages.push({ dialog: true, width, violations: violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
      assert.equal(violations.length, 0, JSON.stringify(report.pages.at(-1)));
      await page.screenshot({ path: `${output}/winners-${width}.png` });
    }
    const first = dialog.getByRole("region", { name: "First place" });
    const before = await first.locator(".winner-entry").count();
    await first.getByRole("button", { name: /Add tie|Add winner/ }).click();
    await expect(first.locator(".winner-entry")).toHaveCount(before + 1);
    await first.getByRole("button", { name: "Add tie", exact: true }).click();
    await expect(first.locator(".winner-entry")).toHaveCount(before + 2);
    await dialog.getByRole("button", { name: "Save draft", exact: true }).click();
    await expect(dialog.getByRole("alert")).toContainText("Choose an eligible school");
    assert.equal(await dialog.getByRole("button", { name: /Publish official results|Publish correction/ }).isDisabled(), true);
    // Cancel unsaved changes, then ensure Escape restores focus on a clean reopen.
    page.once("dialog", prompt => prompt.accept());
    await dialog.getByRole("button", { name: "Close dialog" }).click();
    await trigger.click();
    await dialog.getByRole("heading", { name: "Official score impact" }).waitFor();
    for (let i = 0; i < 15; i++) {
      await page.keyboard.press("Tab");
      assert.equal(await dialog.evaluate(el => el.contains(document.activeElement)), true);
    }
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(trigger).toBeFocused();
    report.checks.push("Tied rows, validation, dirty discard, focus trap, Escape and focus restoration");
  }
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally {
  await browser?.close();
  if (sessionId) await clerk.sessions.revokeSession(sessionId).catch(error => { report.cleanupError = error.message || "Session cleanup failed"; });
  await admin?.close().catch(error => { report.cleanupError = error.message || "Session cleanup failed"; });
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
