import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const output = "verification-evidence/redesign/before";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const page = await browser.newPage();
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of ["/", "/scoreboard", "/schedule", "/results", "/snapshots", "/about", "/admin/login", "/admin"]) {
      await page.goto(`http://localhost:3000${route}`);
      await page.waitForTimeout(1800);
      await page.screenshot({ path: `${output}/${route.slice(1).replaceAll("/", "-") || "home"}-${width}.png`, fullPage: true });
      console.log(`${width} ${route}`);
    }
  }
} finally { await browser.close(); }
