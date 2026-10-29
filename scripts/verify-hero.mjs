import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const output='verification-evidence/hero';await mkdir(output,{recursive:true});
const browser=await chromium.launch({channel:'msedge',headless:true});const report=[];
try {
 const context=await browser.newContext();const page=await context.newPage();const errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{window.heroCls=0;new PerformanceObserver(list=>{for(const entry of list.getEntries())if(!entry.hadRecentInput)window.heroCls+=entry.value;}).observe({type:'layout-shift',buffered:true});});
 for(const [width,height] of [[320,800],[360,800],[375,812],[390,844],[430,932],[768,1024],[1440,900]]) {
  await page.setViewportSize({width,height});await page.goto('http://localhost:3000/');await page.evaluate(()=>document.fonts.ready);
  await page.locator('.connection-status').filter({hasText:'Live updates connected'}).waitFor({timeout:45000});
  await page.locator('.festival-artwork img').evaluateAll(images=>Promise.all(images.map(img=>img.decode())));
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const violations=(await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
  const boxes=await page.locator('.festival-actions a').evaluateAll(links=>links.map(link=>{const r=link.getBoundingClientRect();return document.elementFromPoint(r.x+r.width/2,Math.min(innerHeight-1,r.y+r.height/2))?.closest('a')===link;}));
  assert.ok(boxes.every(Boolean));assert.equal(violations.length,0,JSON.stringify(violations.map(v=>v.id)));
  for(const name of ['Explore Live Scoreboard','View Event Schedule']){const link=page.getByRole('link',{name,exact:true});const href=await link.getAttribute('href');assert.equal((await page.request.get('http://localhost:3000'+href)).status(),200);}
  if(width<768){const menu=page.getByRole('button',{name:'Menu',exact:true});await menu.click();for(const name of ['Scoreboard','Schedule','Results','Snapshots','About','Admin'])await expect(page.locator('#site-menu').getByRole('link',{name,exact:true})).toBeVisible();await page.keyboard.press('Escape');await expect(menu).toBeFocused();}
  await page.screenshot({path:`${output}/hero-${width}.png`});
  report.push({width,height,overflow:false,violations:0,cls:await page.evaluate(()=>window.heroCls)});
 }
 await context.setOffline(true);await expect(page.locator('.connection-status')).toContainText('Offline');await context.setOffline(false);await expect(page.locator('.connection-status')).toContainText('Live updates connected',{timeout:45000});
 assert.deepEqual(errors,[]);report.push({errors,offlineAndReconnect:true});
}finally{await browser.close();await writeFile(`${output}/report.json`,JSON.stringify(report,null,2));}
console.log(JSON.stringify(report));
