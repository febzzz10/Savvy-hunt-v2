import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const baseline = process.argv.includes('--baseline');
const baseURL = process.env.NAV_TEST_URL || 'http://localhost:3000';
// Run with --baseline before making changes to enable exact tablet/mobile comparison.
const output = '.ua/tmp/desktop-header';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const widths = [1920, 1600, 1440, 1366, 1280, 1024, 1023, 960, 768, 390, 375];
const routes = ['/scoreboard', '/schedule', '/results', '/snapshots', '/about', '/admin'];
const snapshots = {};
try {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /hydrat|did not match|server rendered/i.test(message.text())) errors.push(message.text());
  });
  for (const route of ['/', '/about']) {
    for (const width of widths) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto(`${baseURL}${route}`);
      const header = page.locator('.responsive-navigation');
      await expect(header).toBeVisible();
      await expect(header.locator('.brand')).toHaveText('SAVVY HUNT');
      // Wait for hydration before exercising scroll listeners.
      await expect(page.locator('.connection-status')).not.toContainText('Connecting to');
      const styles = () => header.evaluate(el => {
        const selectors = ['', '.nav', '.brand-name', '.menu-toggle', '.nav-links', '.header-meta', '.mobile-bottom-nav'];
        return selectors.map(selector => {
          const target = selector ? el.querySelector(selector) : el;
          const css = getComputedStyle(target);
          return Object.fromEntries(['display', 'position', 'width', 'height', 'padding', 'gap', 'fontSize', 'borderRadius', 'boxShadow', 'backdropFilter', 'backgroundColor', 'top'].map(key => [key, css[key]]));
        });
      });
      const key = `${route}-${width}`;
      const initial = await styles();
      if (width < 1024) snapshots[key] = initial;
      if (width < 960) {
        await expect(header.locator('.nav-links')).toBeHidden();
        await expect(page.locator('.mobile-bottom-nav')).toBeVisible();
        await page.getByRole('button', { name: 'More', exact: true }).click();
        await expect(page.locator('.mobile-navigation-sheet')).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(page.locator('.mobile-navigation-sheet')).not.toBeVisible();
        await expect(page.getByRole('button', { name: 'More', exact: true })).toBeFocused();
      } else {
        await expect(header.locator('.menu-toggle')).toBeHidden();
        await expect(page.locator('.mobile-bottom-nav')).toBeHidden();
        for (const href of routes.filter(href => width < 1024 || href !== '/admin')) await expect(header.locator(`.nav-links a[href="${href}"]`)).toBeVisible();
      }
      const nav = header.locator('.nav');
      const navBox = await nav.boundingBox();
      if (!baseline && width >= 1024) {
        const css = await nav.evaluate(el => {
          const s = getComputedStyle(el);
          return { position: s.position, radius: s.borderRadius, blur: s.backdropFilter, background: s.backgroundColor, panel: getComputedStyle(document.body).getPropertyValue('--panel').trim() };
        });
        expect(css.position).toBe('fixed');
        expect(css.radius).toBe('9999px');
        expect(css.blur).toBe('none');
        expect(css.background).toBe('rgb(255, 255, 255)');
        expect(navBox.y).toBe(24);
        expect(navBox.height).toBe(72);
        expect(navBox.width).toBeLessThanOrEqual(1200);
        expect(navBox.x + navBox.width / 2).toBeCloseTo(await page.evaluate(() => {
          const r = document.body.getBoundingClientRect(); return r.x + r.width / 2;
        }), 0);
        await expect(header.locator('.desktop-home-link')).toBeVisible();
        await expect(header.locator('.public-admin-link')).toBeHidden();
        await expect(header.locator('.desktop-admin-cta')).toHaveText('Admin Panel');
        await expect(header.locator('.desktop-admin-cta')).toBeVisible();
        const boxes = await nav.locator('.brand, .nav-links a:visible, .desktop-admin-cta').evaluateAll(els => els.map(el => {
          const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        }));
        for (let i = 1; i < boxes.length; i++) {
          expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right);
          expect(boxes[i].top).toBeLessThan(boxes[0].bottom);
          expect(boxes[i].right).toBeLessThan(navBox.x + navBox.width);
        }
        expect(await page.locator('main').evaluate(el => el.getBoundingClientRect().top)).toBeGreaterThan(navBox.y + navBox.height);
        if (width === 1440 || width === 1024) await page.screenshot({ path: `${output}/${route === '/' ? 'home' : 'about'}-${width}-top.png` });
      }
      const mainTop = await page.locator('main').evaluate(el => el.getBoundingClientRect().top + scrollY);
      await page.evaluate(() => scrollTo(0, 150));
      if (!baseline && width >= 1024) {
        expect(await nav.boundingBox()).toEqual(navBox);
        if (width === 1440) await page.screenshot({ path: `${output}/${route === '/' ? 'home' : 'about'}-scrolled.png` });
      } else if (!baseline) {
        await expect(header).not.toHaveAttribute('data-scrolled');
        expect(await styles()).toEqual(initial);
      }
      expect(await page.locator('main').evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(mainTop, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      if (!baseline && width >= 1024) {
        expect(await nav.boundingBox()).toEqual(navBox);
      }
      console.log(`passed ${route} ${width}px${baseline ? ' baseline' : ''}`);
    }
  }
  if (baseline) {
    await writeFile(`${output}/baseline.json`, JSON.stringify(snapshots, null, 2));
  } else {
    const previous = await readFile(`${output}/baseline.json`, 'utf8').catch(error => {
      if (error.code !== 'ENOENT') throw error;
      return null;
    });
    if (previous) {
      expect(snapshots).toEqual(JSON.parse(previous));
      console.log('passed unchanged tablet/mobile styles against baseline');
    } else {
      console.log('No pre-change baseline available; tablet/mobile style comparison skipped');
    }
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto(`${baseURL}/about`);
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    for (const href of ['/', ...routes]) {
      await page.locator(href === '/admin' ? '.desktop-admin-cta' : `.nav-links a[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href}(?:/login)?(?:\\?.*)?$`));
      if (href !== '/admin') await expect(page.locator(`.nav-links a[href="${href}"]`)).toHaveAttribute('aria-current', 'page');
    }
    await page.goto(`${baseURL}/scoreboard/test-category`);
    await expect(page.locator('.nav-links a[href="/scoreboard"]')).toHaveAttribute('data-section-active', 'true');
    await page.evaluate(() => scrollTo(0, 150));
    await page.setViewportSize({ width: 1023, height: 700 });
    await expect(page.locator('.desktop-home-link')).toBeHidden();
    await expect(page.locator('.desktop-admin-cta')).toBeHidden();
    await expect(page.locator('.public-admin-link')).toBeVisible();
    await page.setViewportSize({ width: 1024, height: 700 });
    await expect(page.locator('.desktop-home-link')).toBeVisible();
    await expect(page.locator('.desktop-admin-cta')).toBeVisible();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('.desktop-admin-cta').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(errors).toEqual([]);
    console.log('passed routes, active states, skip link, resize, reduced motion, and hydration');
  }
} finally {
  await browser.close();
}
