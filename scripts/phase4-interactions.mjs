import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { baseURL, evidence } from "./phase4-support.mjs";

const result = { startedAt: new Date().toISOString(), checks: [], errors: [] };
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on("pageerror", error => result.errors.push(error.message));
  for (const route of ["/scoreboard", "/schedule", "/scoreboard"]) {
    await page.goto(`${baseURL}${route}`);
    await page.getByRole("status").filter({ hasText: "Live updates connected" }).waitFor();
  }
  result.checks.push("Repeated full navigations hydrate without page exceptions");
  await page.keyboard.press("Tab");
  assert.equal(await page.locator(":focus").textContent(), "Skip to content");
  await page.keyboard.press("Enter");
  assert.equal(await page.locator(":focus").getAttribute("id"), "main-content");
  result.checks.push("Keyboard skip link moves focus to main content");
  await page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Schedule", exact: true }).click();
  await page.getByRole("heading", { name: "Event schedule" }).waitFor();
  assert.equal(await page.getByRole("navigation", { name: "Public navigation" }).getByRole("link", { name: "Schedule", exact: true }).getAttribute("aria-current"), "page");
  result.checks.push("Navigation updates route and current-page state");
  await context.setOffline(true);
  await page.getByRole("status").filter({ hasText: /Offline|Reconnecting/ }).waitFor({ timeout: 5000 });
  await page.getByRole("heading", { name: "Event schedule" }).waitFor();
  result.checks.push("Offline warning appears within 5 seconds while existing page remains visible");
  await context.setOffline(false);
  await page.getByRole("status").filter({ hasText: "Live updates connected" }).waitFor({ timeout: 45000 });
  result.checks.push("Live connection status recovers without page refresh");
  assert.equal(result.errors.length, 0);
} catch (error) { result.failure = error.message; process.exitCode = 1; }
finally { await browser.close(); await evidence("interactions", result); console.log(JSON.stringify(result, null, 2)); }
