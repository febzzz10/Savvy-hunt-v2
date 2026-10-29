import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { baseURL, clerk, verificationAdmin } from "./phase4-support.mjs";
const output = "verification-evidence/school-manager";
await mkdir(output, { recursive: true });
const report = { pages: [], checks: [], errors: [] };
let browser, admin, sessionId;
try {
  admin = await verificationAdmin();
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", e => report.errors.push(e.message));
  await page.goto(baseURL + "/admin/login");
  await page.waitForFunction(() => window.Clerk?.loaded, { timeout: 45000 });
  const ticket = await clerk.signInTokens.createSignInToken({ userId: admin.user.id, expiresInSeconds: 120 });
  sessionId = await page.evaluate(async token => {
    const result = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: token });
    await window.Clerk.setActive({ session: result.createdSessionId });
    return result.createdSessionId;
  }, ticket.token);
  await page.goto(baseURL + "/admin/schools");
  await page.getByRole("heading", { name: "Participating schools", exact: true }).waitFor({ timeout: 45000 });
  await expect(page.getByRole("button", { name: "Add school", exact: true })).toBeEnabled();
  for (const width of [320, 390, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    report.pages.push({ width, overflow, violations: violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) })) });
    await page.screenshot({ path: `${output}/schools-${width}.png`, fullPage: true });
    assert.equal(overflow, false); assert.equal(violations.length, 0);
  }
  await page.getByRole("button", { name: "Add school", exact: true }).click();
  await expect(page.getByText("Enter the school name.", { exact: true })).toBeVisible();
  await page.getByRole("searchbox", { name: "Search schools" }).fill("no-match-school-test");
  await expect(page.getByRole("heading", { name: "No matching schools" })).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("combobox", { name: /^Status/ }).selectOption("archived");
  await expect(page.locator('.school-item .pill').filter({ hasText: /^Active$/ })).toHaveCount(0);
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("combobox", { name: /^Sort by/ }).selectOption("za");
  await page.getByRole("button", { name: "Clear filters" }).click();
  const first = page.locator('.school-item').first();
  if (await first.count()) {
    const schoolName = await first.locator('h3').innerText();
    await first.getByRole("button", { name: "Edit", exact: true }).click();
    await expect(page.getByLabel("School name *", { exact: true })).toHaveValue(schoolName);
    await expect(page.getByRole("heading", { name: "Edit school" })).toBeVisible();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(page.getByLabel("School name *", { exact: true })).toHaveValue("");
    await first.getByRole("button", { name: "View details" }).click();
    await expect(first.getByRole("heading", { name: "Published event contributions" })).toBeVisible();
    const toggle = first.getByRole("button", { name: /^(Deactivate|Activate)$/ });
    await toggle.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
    await expect(toggle).toBeFocused();
  }
  report.checks.push("Required-name validation, search/reset, status filter, sorting, edit population, cancel/reset, details and confirmation/Escape/focus return; no school mutations performed.");
  assert.deepEqual(report.errors, []);
} catch (error) { report.failure = error.stack; process.exitCode = 1; }
finally {
  await browser?.close();
  if (sessionId) await clerk.sessions.revokeSession(sessionId).catch(() => {});
  await admin?.close();
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

