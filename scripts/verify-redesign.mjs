import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const output = "verification-evidence/redesign/after";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const checks = [];
try {
  for (const width of [320, 375, 390, 430, 768, 1024, 1280, 1440, 1920]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const route of ["/", "/scoreboard", "/schedule", "/results", "/snapshots", "/about", "/admin/login", "/admin"]) {
      const errors = [], warnings = [];
      const onError = error => errors.push(error.message);
      const onConsole = message => { if (message.type() === "error" || message.type() === "warning") warnings.push(message.text()); };
      page.on("pageerror", onError);
      page.on("console", onConsole);
      await page.goto(base + route);
      if (!route.startsWith("/admin")) {
        await page.locator(".connection-status").filter({ hasText: "Live updates connected" }).waitFor({ timeout: 45000 });
        await page.locator(".skeleton").first().waitFor({ state: "hidden", timeout: 45000 });
      } else if (route === "/admin/login") await page.getByRole("textbox").first().waitFor();
      else await page.getByRole("heading", { name: "Admin sign in required" }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze()).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target), details: v.nodes.map(n => n.failureSummary) }));
      if (route === "/" && width < 768) {
        const menu = page.getByRole("button", { name: /^(Menu|Close)$/ });
        await menu.click();
        assert.equal(await menu.getAttribute("aria-expanded"), "true");
        await page.keyboard.press("Tab");
        assert.equal(await page.locator(":focus").textContent(), "Scoreboard");
        await page.keyboard.press("Escape");
        assert.equal(await menu.getAttribute("aria-expanded"), "false");
        assert.equal(await menu.evaluate(el => document.activeElement === el), true);
      }
      if (route === "/schedule") {
        const search = page.getByRole("searchbox");
        await search.fill("no-event-matches-this-search");
        await page.getByRole("heading", { name: "No events match your filters" }).waitFor();
        await page.getByRole("button", { name: "Clear filters" }).click();
        assert.equal(await search.inputValue(), "");
        if (width === 1440 || width === 390) {
          await page.getByLabel("Status", { exact: true }).selectOption("upcoming");
          await page.screenshot({ path: output + "/schedule-filtered-" + width + ".png", fullPage: true });
          await page.getByRole("button", { name: "Clear filters" }).click();
        }
      }
      if (route === "/results" && (width === 390 || width === 1440)) {
        const category = page.getByLabel("Category", { exact: true });
        const options = await category.locator("option").evaluateAll(items => items.slice(1).map(item => item.value));
        for (const value of options) {
          await category.selectOption(value);
          if (await page.getByRole("heading", { name: "No results match these filters" }).count()) {
            await page.screenshot({ path: output + "/results-filter-empty-" + width + ".png", fullPage: true });
            break;
          }
        }
        if (await page.getByRole("button", { name: "Clear filters" }).count()) await page.getByRole("button", { name: "Clear filters" }).click();
      }
      const check = { route, width, errors, warnings, overflow, violations };
      checks.push(check);
      console.log(JSON.stringify({ route, width, errors, overflow, violations: violations.map(v => v.id) }));
      await page.screenshot({ path: output + "/" + (route.slice(1).replaceAll("/", "-") || "home") + "-" + width + ".png", fullPage: true });
      page.off("pageerror", onError);
      page.off("console", onConsole);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(output + "/checks.json", JSON.stringify(checks, null, 2));
}
assert.ok(checks.length === 72 && checks.every(c => !c.errors.length && !c.overflow && !c.violations.length), "Browser checks failed; see checks.json");

