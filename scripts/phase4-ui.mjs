import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { baseURL, clerk, anonymous, api, verificationAdmin, evidence } from "./phase4-support.mjs";

const result = { startedAt: new Date().toISOString(), target: baseURL, pages: [], checks: [] };
let browser, admin;
try {
  const edition = await anonymous.query(api.editions.getCurrent, {});
  const categories = await anonymous.query(api.categories.listCurrent, { editionId: edition._id });
  const events = await anonymous.query(api.events.listPublic, { editionId: edition._id });
  const publicRoutes = ["/", "/scoreboard", "/schedule", "/results", "/snapshots", "/about", ...categories.map(c => `/scoreboard/${c.slug}`), ...(events[0] ? [`/events/${events[0].slug}`] : []), "/admin/login", "/admin/setup", "/admin/request-access"];
  const adminRoutes = ["/admin", "/admin/schools", "/admin/events", "/admin/scoreboard", "/admin/announcements", "/admin/gallery", "/admin/settings", "/admin/admins", "/admin/audit", "/admin/setup", "/admin/request-access", ...(events[0] ? [`/admin/events/${events[0]._id}/results`] : [])];
  admin = await verificationAdmin();
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const visitor = await browser.newContext(), staff = await browser.newContext();
  const login = await staff.newPage();
  await login.goto(`${baseURL}/admin/login`);
  await login.waitForFunction(() => window.Clerk?.loaded, { timeout: 45000 });
  const ticket = await clerk.signInTokens.createSignInToken({ userId: admin.user.id, expiresInSeconds: 120 });
  await login.evaluate(async token => {
    const signIn = await window.Clerk.client.signIn.create({ strategy: "ticket", ticket: token });
    await window.Clerk.setActive({ session: signIn.createdSessionId });
  }, ticket.token);
  await login.close();
  for (const width of [320, 768, 1440]) {
    for (const [role, context, routes] of [["anonymous", visitor, publicRoutes], ["super_admin", staff, adminRoutes]]) {
      for (const route of routes) {
        const page = await context.newPage();
        await page.setViewportSize({ width, height: 1000 });
        const entry = { width, role, route, errors: [] };
        page.on("pageerror", error => entry.errors.push(error.message));
        try {
          await page.goto(`${baseURL}${route}`);
          await page.waitForFunction(() => {
            const main = document.querySelector("main");
            return main && !/Checking admin access|Connecting to live event data|Loading (?:official|schedule|gallery|event|updates|result|public content|audit)/i.test(main.textContent);
          }, undefined, { timeout: 45000 });
          if (route === "/admin/login") await page.getByRole("textbox").first().waitFor();
          const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
          entry.violations = scan.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => ({ target: n.target, failure: n.failureSummary })) }));
          entry.layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, headings: document.querySelectorAll("h1").length, title: document.title }));
          if (["/admin", "/admin/gallery", "/admin/request-access", "/admin/login"].includes(route)) await page.screenshot({ path: `verification-evidence/phase4-${route.replaceAll("/", "-").slice(1)}-${width}.png`, fullPage: true });
        } catch (error) { entry.failure = error.message; }
        result.pages.push(entry);
        console.log(JSON.stringify({ width, role, route, errors: entry.errors.length, violations: entry.violations?.map(v => v.id), overflow: entry.layout?.overflow, failure: entry.failure }));
        await page.close();
      }
    }
  }
} catch (error) { result.failure = error.message; console.error(error.message); }
finally {
  if (browser) await browser.close();
  if (admin) await admin.close();
  await evidence("ui", result);
}
if (result.failure || result.pages.some(p => p.failure || p.errors.length || p.violations?.length || p.layout?.overflow)) process.exitCode = 1;
