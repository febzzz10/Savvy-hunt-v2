import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const output = 'verification-evidence/home-sections';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = [];
try {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    const Native = window.WebSocket;
    window.homeSockets = [];
    window.WebSocket = class extends Native { constructor(...args) { super(...args); if (String(args[0]).includes('convex.cloud')) window.homeSockets.push(this); } };
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto('http://localhost:3004/');
  await page.locator('.connection-status').filter({ hasText: 'Live updates connected' }).waitFor({ timeout: 45000 });
  await page.locator('.home-sections .skeleton').first().waitFor({ state: 'hidden' });
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    const violations = (await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()).violations;
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    const boxes = await page.locator('.home-sections>section').evaluateAll(items => items.map(el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, bottom: r.bottom }; }));
    assert.equal(boxes.length, 3); assert.ok(boxes[1].y >= boxes[0].bottom && boxes[2].y >= boxes[1].bottom);
    assert.ok(boxes.every(b => b.width === boxes[0].width)); assert.equal(overflow, false); assert.equal(violations.length, 0);
    await page.screenshot({ path: `${output}/home-${width}.png`, fullPage: true });
    report.push({ width, overflow, violations: violations.length, stacked: true });
  }
  const urls = await page.locator('.home-sections a').evaluateAll(items => [...new Set(items.map(el => el.getAttribute('href')))]);
  for (const href of urls) { const response = await page.request.get('http://localhost:3004' + href); assert.equal(response.status(), 200); }
  await page.evaluate(() => window.homeSockets.forEach(socket => socket.close()));
  await page.locator('.connection-status').filter({ hasText: 'Live updates connected' }).waitFor({ timeout: 45000 });
  assert.deepEqual(errors, []);
  report.push({ links: urls, realtime: 'Convex connected and reconnected; no official data modified', errors });
} finally { await browser.close(); await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2)); }
console.log(JSON.stringify(report));
