// Isolated test fixtures only: renders the production card without publishing data.
import { build } from 'esbuild';
import { chromium, webkit, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {AchievementCards} from './components/home/achievement-card';
    const results = [1,2,3].map(i=>({eventId:String(i),eventTitle:'Test event '+i,eventSlug:'event-'+i,categoryId:'arts',publishedAt:1800000000000,entries:i===3?[]:[{schoolId:'a',schoolName:'School A with a long official name',placement:1,points:10,participantName:'Approved participant'},{schoolId:'b',schoolName:'School B',placement:3,points:0},{schoolId:'c',schoolName:'School C',placement:3,points:0}]}));
    window.updateResults=()=>{results[0]={...results[0],entries:[{schoolId:'c',schoolName:'Corrected School',placement:2,points:6}]};render()};
    const render=()=>root.render(<div className={location.search.includes('notices')?'editorial-columns':''}><section><h2>The latest achievements</h2><AchievementCards results={results} categories={[{_id:'arts',name:'Arts and literary competitions'}]}/></section>{location.search.includes('notices')&&<section><h2>Notice board</h2><p>News from the organizers</p></section>}</div>);const root=createRoot(document.getElementById('root'));render();`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, outdir: 'out', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'test-link', setup(builder) {
    builder.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'test'}));
    builder.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`import React from 'react'; export default function Link(props){return React.createElement('a',props)}`,loader:'js',resolveDir:process.cwd()}));
  }}],
});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;
let css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;
let globalCss=(await readFile('app/globals.css','utf8')).split('\n').slice(2).join('\n');
if(process.argv.includes('--production-css')){
  const files=await readdir('.next/static/chunks');
  let found=false;
  for(const file of files.filter(file=>file.endsWith('.css'))){
    const text=await readFile(`.next/static/chunks/${file}`,'utf8');
    if(text.includes('.achievement-grid{')){css=text;found=true;}
    if(text.includes('.skip-link{'))globalCss=text;
  }
  assert.ok(found,'build the app before testing production CSS');
}
const server=createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(js);}
  else res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Card interaction test</title><style>${globalCss}\n${css}</style></head><body><a class="skip-link" href="#root">Skip to content</a><main class="shell" id="root"></main><script src="/app.js"></script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const engine=process.argv.includes('--webkit')?'webkit':'chromium';
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='webkit'?{headless:true}:{channel:'msedge',headless:true});
const checks=[];
const output=`verification-evidence/achievement-cards/${engine}${process.argv.includes('--notices')?'-notices':''}${process.argv.includes('--production-css')?'-production':''}`;
await mkdir(output,{recursive:true});
try {
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}${process.argv.includes('--notices')?'/?notices':''}`);
  const controls=page.locator('.achievement-flip-control');
  await expect(controls).toHaveCount(3);
  await expect(page.locator('.achievement-card a')).toHaveCount(0);
  for(const [width,fullWidthColumns] of [[320,1],[360,1],[375,1],[390,1],[414,1],[430,1],[768,2],[1024,3],[1440,3]]){
    const columns=process.argv.includes('--notices')?(width>=1440?2:1):fullWidthColumns;
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('.achievement-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),columns);
    const sizing=await page.locator('.achievement-grid').evaluate(grid=>({grid:grid.clientWidth,columns:getComputedStyle(grid).gridTemplateColumns,cards:[...grid.children].map(card=>({width:card.clientWidth,face:card.querySelector('.achievement-front').clientWidth,rotor:card.querySelector('.achievement-rotor').clientWidth}))}));
    assert.ok(sizing.cards.every(card=>Math.abs(card.width-(sizing.grid-24*(columns-1))/columns)<2),'cards must fill their grid tracks');
    assert.ok(sizing.cards.every(card=>Math.abs(card.width-card.face)<3 && card.width===card.rotor),'faces and rotor must fill the card');
    const heights=await page.locator('.achievement-perspective').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
    assert.ok(Math.max(...heights)-Math.min(...heights)<1);
    assert.ok(await page.locator('.achievement-card').evaluateAll(els=>els.every(el=>Math.abs(el.getBoundingClientRect().height-el.querySelector('.achievement-perspective').getBoundingClientRect().height)<1)));
    assert.ok(await page.locator('.achievement-rotor').evaluateAll(els=>els.every(el=>{const a=el.querySelector('.achievement-front'),b=el.querySelector('.achievement-back');return a.offsetWidth===b.offsetWidth&&a.offsetHeight===b.offsetHeight})), 'front and back dimensions must match');
    if(width<768){
      assert.ok(await page.locator('.achievement-top .pill').evaluateAll(els=>els.every(el=>el.clientHeight<50)), 'published labels must not wrap letter by letter');
      await page.screenshot({path:`${output}/mobile-${width}.png`,fullPage:true});
    }
    checks.push({width,columns,sizing,equalHeights:true,identicalFaces:true,overflow:false});
  }
  const skip=page.locator('.skip-link');
  assert.ok(await skip.evaluate(el=>el.getBoundingClientRect().bottom<=0),'skip link must be offscreen without focus');
  await skip.focus();assert.ok(await skip.evaluate(el=>el.getBoundingClientRect().top>=0),'skip link must appear on focus');
  await page.keyboard.press('Tab');
  checks.push({skipLink:'hidden until focused; no CSS change needed'});
  await controls.first().click();await expect(controls.first()).toHaveAttribute('aria-pressed','true');await expect(controls.nth(1)).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('.achievement-front').first()).toHaveAttribute('inert','');
  await expect(page.locator('.achievement-back').first()).toHaveAttribute('aria-hidden','false');
  await controls.first().press('Space');await expect(controls.first()).toHaveAttribute('aria-pressed','false');
  await controls.first().press('Enter');await expect(controls.first()).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>page.locator('.achievement-rotor').first().evaluate(el=>Number(new DOMMatrixReadOnly(getComputedStyle(el).transform).m11.toFixed(2)))).toBe(-1);
  await page.evaluate(()=>window.updateResults());await expect(page.locator('.achievement-back').first()).toContainText('Corrected School');await expect(page.locator('.achievement-back').first()).not.toContainText('School A');
  await controls.nth(2).click();await expect(page.locator('.achievement-back').nth(2)).toContainText('Results awaited');
  const violations=(await new AxeBuilder({page}).include('.achievement-grid').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
  assert.deepEqual(violations,[]);
  await page.emulateMedia({reducedMotion:'reduce'});await controls.first().click();await controls.first().click();
  assert.equal(await page.locator('.achievement-rotor').first().evaluate(el=>getComputedStyle(el).transform),'none');
  await page.setViewportSize({width:1440,height:1000});
  await page.screenshot({path:`${output}/desktop.png`,fullPage:true});
  assert.deepEqual(errors,[]);
  checks.push({mouseKeyboard:true,independent:true,correction:true,perCardLinksRemoved:true,noLinkSpace:true,reducedMotion:true,axeViolations:0,errors});
  const touch=await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});const mobile=await touch.newPage();await mobile.goto(`http://127.0.0.1:${server.address().port}`);
  await mobile.locator('.achievement-flip-control').first().tap();await expect(mobile.locator('.achievement-flip-control').first()).toHaveAttribute('aria-pressed','true');
  await expect.poll(()=>mobile.locator('.achievement-rotor').first().evaluate(el=>Number(new DOMMatrixReadOnly(getComputedStyle(el).transform).m11.toFixed(2)))).toBe(-1);
  await mobile.screenshot({path:`${output}/mobile-winners.png`,fullPage:true});
  for(const height of [600,844]){
    await mobile.setViewportSize({width:390,height});
    assert.equal(await mobile.locator('.achievement-card').first().evaluate(el=>el.offsetWidth),350);
  }
  await mobile.addStyleTag({content:'html { -webkit-text-size-adjust:200%; text-size-adjust:200%; }'});
  assert.equal(await mobile.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await mobile.locator('.achievement-card').first().evaluate(el=>el.offsetWidth),350);
  checks.push({touch:true,viewportHeightChanges:true,textSizeAdjust200:true});await touch.close();
  await writeFile(`${output}/report.json`,JSON.stringify(checks,null,2));
  console.log(JSON.stringify({engine,output,viewports:checks.filter(check=>check.width).map(({width,columns})=>({width,columns})),checks:'passed'}));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
