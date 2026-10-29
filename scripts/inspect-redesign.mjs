import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const browser = await chromium.launch({ channel: "msedge", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  page.on("console", message => { if (["error", "warning"].includes(message.type())) console.log(message.type(), message.text()); });
  page.on("response", response => { if (response.status() >= 400) console.log("HTTP", response.status(), response.url().split("?")[0]); });
  for (const route of ["/", "/admin/login"]) {
    await page.goto(`http://localhost:3000${route}`);
    await page.waitForTimeout(2500);
    const scan = await new AxeBuilder({ page }).analyze();
    console.log(JSON.stringify(scan.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({ target: n.target, html: n.html, failure: n.failureSummary })) }))));
    await page.screenshot({ path: `verification-evidence/redesign/inspect-${route === "/" ? "home" : "login"}.png`, fullPage: true });
  }
} finally { await browser.close(); }
