import { chromium, expect } from '@playwright/test';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const page=await browser.newPage();
 for(const width of [320,375,390,430,768,959,960,1024,1199,1200,1440]) {
  await page.setViewportSize({width,height:700});await page.goto('http://localhost:3000/about');
  const header=page.locator('.responsive-navigation');await expect(header).toBeVisible();
  await expect(header.locator('a[href="/about"]')).toHaveAttribute('aria-current','page');
  if(width<960){const toggle=header.locator('.menu-toggle');await toggle.click();await expect(header.locator('.nav-links')).toBeVisible();await page.keyboard.press('Escape');await expect(toggle).toBeFocused();await expect(header.locator('.nav-links')).toBeHidden();await toggle.click();await header.locator('a[href="/schedule"]').click();await expect(header.locator('.nav-links')).toBeHidden();}
  const overflow=await header.evaluate(el=>el.scrollWidth>innerWidth);if(overflow)throw Error('overflow '+width);
  console.log('passed',width);
 }
 await page.setViewportSize({width:390,height:320});await page.locator('.menu-toggle').click();await page.setViewportSize({width:1024,height:700});await page.setViewportSize({width:390,height:700});await expect(page.locator('.nav-links')).toBeHidden();console.log('resize reset passed');
}finally{await browser.close();}
