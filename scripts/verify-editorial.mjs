import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
const base = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(base).hostname));
const output = "verification-evidence/editorial";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const checks = [];
try {
  for (const width of [320, 390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const page = await context.newPage();
    for (const route of ["/", "/scoreboard", "/schedule", "/results", "/snapshots", "/about", "/admin/login", "/admin"]) {
      const errors = [];
      const onError = error => errors.push(error.message);
      page.on("pageerror", onError);
      await page.goto(`${base}${route}`);
      await page.waitForTimeout(1800);
      if (!route.startsWith("/admin")) await page.getByRole("status").filter({ hasText: "Live updates connected" }).waitFor({ timeout: 30000 });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map(v => ({ id: v.id, targets: v.nodes.map(n => n.target) }));
      if (route === "/schedule") {
        const search = page.getByRole("searchbox");
        await search.fill("no-event-matches-this-search");
        await page.getByRole("button", { name: "Clear filters" }).click();
        assert.equal(await search.inputValue(), "");
      }
      if (route === "/snapshots") {
        const photo = page.getByRole("button", { name: /^Open photograph:/ }).first();
        if (await photo.count()) {
          await photo.click();
          await page.getByRole("dialog").waitFor();
          await page.keyboard.press("Escape");
          assert.equal(await page.getByRole("dialog").count(), 0);
          assert.equal(await photo.evaluate(el => document.activeElement === el), true);
        }
      }
      const check = { route, width, errors, overflow, violations };
      checks.push(check);
      console.log(JSON.stringify(check));
      await page.screenshot({ path: `${output}/after-${route.slice(1).replaceAll("/", "-") || "home"}-${width}.png`, fullPage: true });
      page.off("pageerror", onError);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/checks.json`, JSON.stringify(checks, null, 2));
}
assert.ok(checks.length === 32 && checks.every(c => !c.errors.length && !c.overflow && !c.violations.length), "Browser checks failed; see checks.json");
