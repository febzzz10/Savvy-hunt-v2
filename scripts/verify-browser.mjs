import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { mkdir, writeFile } from "node:fs/promises";
process.loadEnvFile(".env.local");
const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const edition = await client.query(api.editions.getCurrent, {});
const categories = edition ? await client.query(api.categories.listCurrent, { editionId: edition._id }) : [];
const events = edition ? await client.query(api.events.listPublic, { editionId: edition._id }) : [];
const routes = ["/", "/scoreboard", "/schedule", "/results", "/snapshots", "/about", ...(categories.length ? [`/scoreboard/${categories[1].slug}`] : []), ...(events.length ? [`/events/${events[0].slug}`] : [])];
const browser = await chromium.launch({ channel: "msedge", headless: true });
const evidence = [];
await mkdir("verification-evidence", { recursive: true });
try {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    for (const route of routes) {
      const page = await context.newPage(), errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForFunction(() => { const text = document.querySelector("main")?.textContent ?? ""; return text.length > 10 && !/Connecting to live event data|Loading (?:official|schedule|gallery|event|updates)/.test(text); }, { timeout: 30000 });
      const violations = (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze()).violations.map(item => ({ id: item.id, impact: item.impact, count: item.nodes.length, nodes: item.nodes.map(node => ({ target: node.target, failure: node.failureSummary })) }));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      evidence.push({ viewport: name, route, errors, overflow, violations });
      console.log(JSON.stringify(evidence.at(-1)));
      if (["/", "/schedule", "/snapshots"].includes(route)) await page.screenshot({ path: `verification-evidence/${route === "/" ? "home" : route.slice(1)}-${name}.png`, fullPage: true });
      await page.close();
    }
    await context.close();
  }
} finally { await browser.close(); await writeFile("verification-evidence/browser.json", JSON.stringify(evidence, null, 2)); }
if (evidence.some(item => item.errors.length || item.overflow || item.violations.length)) process.exitCode = 1;
