import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import AxeBuilder from "@axe-core/playwright";
const base = "http://localhost:3001";
const output = "verification-evidence/redesign/production";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
const measurements = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: 1000 } });
    await context.addInitScript(() => {
      window.__visualMetrics = { lcp: 0, cls: 0 };
      new PerformanceObserver(list => { for (const entry of list.getEntries()) window.__visualMetrics.lcp = entry.startTime; }).observe({ type: "largest-contentful-paint", buffered: true });
      new PerformanceObserver(list => { for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__visualMetrics.cls += entry.value; }).observe({ type: "layout-shift", buffered: true });
    });
    const page = await context.newPage();
    for (const route of ["/", "/scoreboard", "/schedule", "/results", "/snapshots", "/about", "/admin/login"]) {
      const errors = [];
      const listener = e => errors.push(e.message);
      page.on("pageerror", listener);
      await page.goto(base + route);
      if (route === "/admin/login") await page.getByRole("textbox").first().waitFor();
      else await page.locator(".connection-status").filter({ hasText: "Live updates connected" }).waitFor({ timeout: 45000 });
      await page.locator(".skeleton").first().waitFor({ state: "hidden" });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(1200);
      const metrics = await page.evaluate(() => ({ ...window.__visualMetrics, overflow: document.documentElement.scrollWidth > innerWidth, domReady: performance.getEntriesByType("navigation")[0]?.domContentLoadedEventEnd }));
      const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze()).violations.map(v => v.id);
      measurements.push({ route, width, ...metrics, errors, violations });
      await page.screenshot({ path: `${output}/${route.slice(1).replaceAll("/", "-") || "home"}-${width}.png`, fullPage: true });
      page.off("pageerror", listener);
    }
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/metrics.json`, JSON.stringify({ conditions: "Local production build, desktop Edge engine at desktop/mobile viewport sizes; unthrottled network and CPU. Not field Core Web Vitals or Lighthouse scores.", measurements }, null, 2));
}
console.log(JSON.stringify(measurements, null, 2));
assert.ok(measurements.every(m => !m.errors.length && !m.overflow && !m.violations.length));
