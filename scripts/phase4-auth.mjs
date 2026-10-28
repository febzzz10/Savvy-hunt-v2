import { chromium } from "@playwright/test";
import { randomBytes } from "node:crypto";
import { ConvexHttpClient } from "convex/browser";
import assert from "node:assert/strict";
import { baseURL, clerk, api, verificationAdmin, evidence } from "./phase4-support.mjs";

const result = { startedAt: new Date().toISOString(), checks: [], limitations: ["Temporary Clerk development user; organizer staff devices, production domains, MFA/OAuth and real mailbox recovery remain separate rehearsals."] };
let browser, user, admin, identity;
const email = `savvy-phase4-${Date.now()}+clerk_test@example.com`;
const password = `Aa1!${randomBytes(24).toString("base64url")}`;
const replacement = `Bb2!${randomBytes(24).toString("base64url")}`;
try {
  admin = await verificationAdmin();
  user = await clerk.users.createUser({ emailAddress: [email], password, firstName: "Phase 4 development verification" });
  const session = await clerk.sessions.createSession({ userId: user.id });
  const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  client.setAuth((await clerk.sessions.getToken(session.id, "convex")).jwt);
  identity = await client.query(api.admins.getIdentityKey, {});
  await clerk.sessions.revokeSession(session.id);
  await admin.client.mutation(api.admins.save, { authUserId: identity, displayName: "Phase 4 temporary editor", role: "editor", isActive: true });
  browser = await chromium.launch({ channel: "msedge", headless: true });
  const context = await browser.newContext();
  context.setDefaultTimeout(20000);
  const page = await context.newPage();
  await page.goto(`${baseURL}/admin/login`);
  await page.getByRole("textbox").first().fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.locator('input[name="password"]').fill("Wrong-password-phase4!32");
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByText(/password is incorrect|incorrect password|invalid password/i).first().waitFor();
  result.checks.push("Normal Clerk password form rejects incorrect password");
  await page.locator('input[name="password"]').fill(password);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  // Clerk can request a development email code on a new device after password entry.
  await Promise.race([
    page.waitForFunction(() => window.Clerk?.session, undefined, { timeout: 45000 }),
    page.locator('input[autocomplete="one-time-code"]').first().waitFor({ timeout: 45000 }),
  ]);
  if (!await page.evaluate(() => Boolean(window.Clerk?.session))) {
    await page.locator('input[autocomplete="one-time-code"]').first().fill("424242");
    const continueButton = page.getByRole("button", { name: "Continue", exact: true });
    if (await continueButton.isVisible()) await continueButton.click();
    await page.waitForFunction(() => window.Clerk?.session, undefined, { timeout: 15000 });
    result.checks.push("Clerk new-device email challenge completed with development test OTP");
  }
  await page.waitForFunction(() => window.Clerk?.session, undefined, { timeout: 45000 });
  await page.goto(`${baseURL}/admin/events`);
  await page.getByRole("heading", { name: "Events", exact: true }).waitFor();
  result.checks.push("Normal email/password UI establishes a real Clerk session and authorized editor page");
  assert.equal(await page.getByRole("link", { name: "Admins", exact: true }).count(), 0);
  result.checks.push("Editor navigation omits super-admin access management");
  await page.goto(`${baseURL}/admin/settings`);
  await page.getByRole("heading", { name: "Super admin access required", exact: true }).waitFor();
  result.checks.push("Direct editor navigation to super-admin settings shows a permission message");
  await page.getByRole("button", { name: "Sign out", exact: true }).click();
  await page.waitForFunction(() => window.Clerk?.loaded && !window.Clerk.session);
  result.checks.push("Visible sign-out control ends the browser session");
  await page.goto(`${baseURL}/admin/login`);
  await page.getByRole("textbox").first().fill(email);
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByRole("button", { name: /forgot.*password/i }).or(page.getByRole("link", { name: /forgot.*password/i })).click();
  const prepared = page.waitForResponse(response => response.url().includes("/prepare_first_factor") && response.request().method() === "POST", { timeout: 15000 });
  await page.getByRole("button", { name: "Reset your password", exact: true }).click();
  const preparation = await prepared;
  result.resetPreparationStatus = preparation.status();
  assert.ok(preparation.ok(), "Clerk password reset code preparation failed");
  const code = page.locator('input[autocomplete="one-time-code"]').first();
  await code.fill("424242");
  const verify = page.getByRole("button", { name: "Continue", exact: true });
  if (await verify.isVisible()) await verify.click();
  await page.locator('input[type="password"]').first().fill(replacement);
  const passwords = page.locator('input[type="password"]');
  if (await passwords.count() > 1) await passwords.nth(1).fill(replacement);
  await page.getByRole("button", { name: /^(reset password|reset your password|continue|save|set password)$/i }).click();
  await page.waitForFunction(() => window.Clerk?.session, undefined, { timeout: 45000 });
  result.checks.push("Forgot-password UI resets password using Clerk development test OTP (no real email)");
  await page.goto(`${baseURL}/admin/events`);
  await page.getByRole("heading", { name: "Events", exact: true }).waitFor();
  result.checks.push("Recovered session reaches Convex-protected editor page");
} catch (error) {
  result.failure = error.message;
  if (browser) {
    const page = browser.contexts()[0]?.pages()[0];
    if (page) {
      result.visibleText = (await page.locator("main").innerText()).replaceAll(email, "[development email]");
      result.visibleControls = await page.locator("button, a, input").evaluateAll(nodes => nodes.map(n => ({ tag: n.tagName, name: n.getAttribute("name"), type: n.getAttribute("type"), autocomplete: n.getAttribute("autocomplete"), text: n.tagName === "INPUT" ? undefined : n.textContent?.trim().slice(0, 90) })));
    }
  }
} finally {
  if (identity && admin) { await admin.refresh(); await admin.client.mutation(api.admins.save, { authUserId: identity, displayName: "Phase 4 temporary editor", role: "editor", isActive: false }); }
  if (user) await clerk.users.deleteUser(user.id);
  if (admin) await admin.close();
  if (browser) await browser.close();
  await evidence("auth", result);
  console.log(JSON.stringify(result, null, 2));
}
if (result.failure) process.exitCode = 1;
