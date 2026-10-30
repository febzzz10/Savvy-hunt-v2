import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const browser=await chromium.launch({channel:'msedge',headless:true});
try {
 const context=await browser.newContext(); const page=await context.newPage();
 for(const width of [320,375,390,430,768,959,960,1024,1440]) {
  await page.setViewportSize({width,height:760});await page.goto('http://localhost:3000/');
  const nav=page.getByRole('navigation',{name:'Mobile navigation',exact:true});
  if(width<960){
   await expect(nav).toBeVisible();await expect(nav.getByRole('link',{name:'Home',exact:true})).toHaveAttribute('aria-current','page');
   await nav.getByRole('button',{name:'More',exact:true}).click();const dialog=page.getByRole('dialog');await expect(dialog).toBeVisible();
   await expect(page.getByRole('button',{name:'Close',exact:true})).toBeFocused();
   await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await expect(nav.getByRole('button')).toBeFocused();
   await nav.getByRole('button').click();await dialog.getByRole('link',{name:'About',exact:true}).click();await expect(dialog).toBeHidden();await expect(nav.getByRole('button')).toHaveAttribute('data-active','true');
   await nav.getByRole('link',{name:'Scoreboard',exact:true}).click();await expect(nav.getByRole('link',{name:'Scoreboard',exact:true})).toHaveAttribute('aria-current','page');
   await page.goBack();await expect(nav.getByRole('button')).toHaveAttribute('data-active','true');
   const violations=(await new AxeBuilder({page}).include('.mobile-bottom-nav').analyze()).violations;if(violations.length)throw Error(JSON.stringify(violations));
   await nav.screenshot({path:`verification-evidence/bottom-nav-${width}.png`});
  }else await expect(nav).toBeHidden();
  if(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth))throw Error('overflow '+width);
  console.log('passed width',width);
 }
 await page.setViewportSize({width:390,height:320});await page.emulateMedia({reducedMotion:'reduce'});await page.goto('http://localhost:3000/scoreboard/test-category');
 const nav=page.getByRole('navigation',{name:'Mobile navigation',exact:true});await expect(nav.getByRole('link',{name:'Scoreboard',exact:true})).toHaveAttribute('data-active','true');await expect(nav.getByRole('link',{name:'Scoreboard',exact:true})).not.toHaveAttribute('aria-current');
 await nav.getByRole('button').click();await page.getByRole('dialog').getByRole('link',{name:'Admin',exact:true}).scrollIntoViewIfNeeded();await page.mouse.click(2,2);await expect(page.getByRole('dialog')).toBeHidden();
 await nav.getByRole('button').click();await page.setViewportSize({width:1024,height:760});await expect(page.getByRole('dialog')).toBeHidden();
 console.log('passed nested route, short viewport, reduced motion, backdrop, resize');
 await page.setViewportSize({width:768,height:320});await nav.getByRole('button').click();
 if(await page.evaluate(()=>document.body.style.overflow)!=='hidden')throw Error('scroll lock');
 for(let i=0;i<8;i++){await page.keyboard.press('Tab');if(!await page.evaluate(()=>document.querySelector('dialog').contains(document.activeElement)))throw Error('focus escaped');}
 await page.keyboard.press('Escape');await expect.poll(()=>page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
 await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
 const bar=await nav.boundingBox();const footer=await page.locator('.footer').boundingBox();if(footer.y+footer.height>bar.y)throw Error('footer covered');
 console.log('passed landscape, keyboard containment, scroll restore, footer clearance');
} finally {await browser.close();}
