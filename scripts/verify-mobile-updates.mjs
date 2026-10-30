import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { readFile, writeFile } from 'node:fs/promises';
const output='verification-evidence/mobile-updates';
const browser=await chromium.launch({channel:'msedge',headless:true});const checks=[];
try {
 const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 for(const width of [360,375,390,430,1440]) {
  await page.setViewportSize({width,height:1000});await page.goto('http://localhost:3000/');await page.locator('.connection-status').filter({hasText:'Live updates connected'}).waitFor({timeout:45000});await page.waitForTimeout(700);await page.addStyleTag({content:'nextjs-portal { display:none; }'});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  if(width<768){await expect(page.locator('.quick-access')).toBeHidden();await expect(page.locator('.mobile-event-updates')).toBeVisible();assert.equal(await page.locator('.mobile-update-card').count(),3);
   const violations=(await new AxeBuilder({page}).include('.mobile-event-updates').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;assert.equal(violations.length,0,JSON.stringify(violations));
   const links=await page.locator('.mobile-update-card').evaluateAll(items=>items.map(el=>el.getAttribute('href')));for(const href of links)assert.equal((await page.request.get('http://localhost:3000'+href)).status(),200);
   await page.locator('.mobile-event-updates').screenshot({path:`${output}/mobile-${width}.png`});
   checks.push({width,cards:3,overflow:false,violations:0,links});
  }else{await expect(page.locator('.mobile-event-updates')).toBeHidden();const after=await page.locator('.quick-access').screenshot({path:`${output}/desktop-after.png`});const beforePixels=await sharp(await readFile(`${output}/desktop-before.png`)).raw().toBuffer();const afterPixels=await sharp(after).raw().toBuffer();assert.equal(beforePixels.length,afterPixels.length);let changed=0;for(let i=0;i<beforePixels.length;i++){const delta=Math.abs(beforePixels[i]-afterPixels[i]);assert.ok(delta<=1,"Desktop pixel difference exceeds rounding noise");if(delta)changed++;}assert.ok(changed/beforePixels.length<0.001);assert.deepEqual(await page.locator('.quick-access').boundingBox(),JSON.parse(await readFile(`${output}/desktop-before.json`,'utf8')));checks.push({width,desktopGeometryUnchanged:true,desktopRenderingWithinRoundingNoise:true});}
 }
 await context.setOffline(true);await expect(page.locator('.connection-status')).toContainText('Offline');await context.setOffline(false);await expect(page.locator('.connection-status')).toContainText('Live updates connected',{timeout:45000});assert.deepEqual(errors,[]);checks.push({errors,offlineReconnect:true});
}finally{await browser.close();await writeFile(`${output}/report.json`,JSON.stringify(checks,null,2));}
console.log(JSON.stringify(checks));
