import { chromium, expect } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const baseline = process.argv.includes('--baseline');
// Run with --baseline before making changes to enable exact tablet/mobile comparison.
const output = '.ua/tmp/desktop-header';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const widths = [1920, 1440, 1280, 1024, 1023, 960, 768, 390, 375];
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
      await page.goto(`http://localhost:3000${route}`);
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
        for (const href of routes) await expect(header.locator(`.nav-links a[href="${href}"]`)).toBeVisible();
      }
      const mainTop = await page.locator('main').evaluate(el => el.getBoundingClientRect().top + scrollY);
      await page.evaluate(() => scrollTo(0, 150));
      if (!baseline && width >= 1024) {
        await expect(header).toHaveAttribute('data-scrolled', 'true');
        await expect.poll(async () => (await styles())[0].borderRadius).toBe('20px');
        await expect.poll(async () => header.evaluate(el => el.getBoundingClientRect().width)).toBeLessThan(Number.parseFloat(initial[0].width));
        const scrolled = await styles();
        expect(scrolled[0].position).toBe('sticky');
        expect(scrolled[0].boxShadow).not.toBe('none');
        expect(scrolled[0].backdropFilter).toContain('blur');
        expect(scrolled[0].height).toBe(initial[0].height);
        const boxes = await header.locator('.brand, .nav-links a').evaluateAll(els => els.map(el => {
          const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom };
        }));
        for (let i = 1; i < boxes.length; i++) {
          expect(boxes[i].left).toBeGreaterThanOrEqual(boxes[i - 1].right);
          expect(boxes[i].top).toBeLessThan(boxes[0].bottom);
        }
        if (width === 1440) await page.screenshot({ path: `${output}/${route === '/' ? 'home' : 'about'}-scrolled.png` });
      } else if (!baseline) {
        await expect(header).not.toHaveAttribute('data-scrolled');
        expect(await styles()).toEqual(initial);
      }
      expect(await page.locator('main').evaluate(el => el.getBoundingClientRect().top + scrollY)).toBeCloseTo(mainTop, 0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.evaluate(() => scrollTo(0, 0));
      if (!baseline && width >= 1024) {
        await expect(header).not.toHaveAttribute('data-scrolled');
        await expect.poll(async () => (await styles())[0].borderRadius).toBe('0px');
        await expect.poll(async () => (await styles())[0].width).toBe(initial[0].width);
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
    await page.goto('http://localhost:3000/about');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator('#main-content')).toBeFocused();
    for (const href of routes) {
      await page.locator(`.nav-links a[href="${href}"]`).click();
      await expect(page).toHaveURL(new RegExp(`${href}(?:/login)?(?:\\?.*)?$`));
      if (href !== '/admin') await expect(page.locator(`.nav-links a[href="${href}"]`)).toHaveAttribute('aria-current', 'page');
    }
    await page.goto('http://localhost:3000/scoreboard/test-category');
    await expect(page.locator('.nav-links a[href="/scoreboard"]')).toHaveAttribute('data-section-active', 'true');
    await page.evaluate(() => scrollTo(0, 150));
    await page.setViewportSize({ width: 1023, height: 700 });
    await expect(page.locator('.responsive-navigation')).not.toHaveAttribute('data-scrolled');
    await page.setViewportSize({ width: 1024, height: 700 });
    await expect(page.locator('.responsive-navigation')).toHaveAttribute('data-scrolled', 'true');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    expect(await page.locator('.responsive-navigation').evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s');
    expect(errors).toEqual([]);
    console.log('passed routes, active states, skip link, resize, reduced motion, and hydration');
  }
} finally {
  await browser.close();
}
