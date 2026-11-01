// Isolated test fixtures only: renders the production card without publishing data.
import { build } from 'esbuild';
import { chromium, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const bundle = await build({
  stdin: { contents: `import React from 'react'; import {createRoot} from 'react-dom/client'; import {AchievementCards} from './components/home/achievement-card';
    const results = [1,2,3,4,5,6].map(i=>({eventId:String(i),eventTitle:'Test event '+i,eventSlug:'event-'+i,categoryId:'arts',publishedAt:1800000000000,entries:i===4?[]:[{schoolId:'a',schoolName:'School A with a long official name',placement:1,points:10,participantName:'Approved participant'},{schoolId:'b',schoolName:'School B',placement:3,points:0},{schoolId:'c',schoolName:'School C',placement:3,points:0}]}));
    window.updateResults=()=>{results[0]={...results[0],entries:[{schoolId:'c',schoolName:'Corrected School',placement:2,points:6}]};render()};
    const render=()=>root.render(<AchievementCards results={results} categories={[{_id:'arts',name:'Arts'}]}/>);const root=createRoot(document.getElementById('root'));render();`, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true, write: false, outdir: 'out', jsx: 'automatic',
  define: { 'process.env.NODE_ENV': '"production"' },
  plugins: [{ name: 'test-link', setup(builder) {
    builder.onResolve({filter:/^next\/link$/},()=>({path:'link',namespace:'test'}));
    builder.onLoad({filter:/.*/,namespace:'test'},()=>({contents:`import React from 'react'; export default function Link(props){return React.createElement('a',props)}`,loader:'js',resolveDir:process.cwd()}));
  }}],
});
const js=bundle.outputFiles.find(f=>f.path.endsWith('.js')).text;
const css=bundle.outputFiles.find(f=>f.path.endsWith('.css')).text;
const globalCss=(await readFile('app/globals.css','utf8')).split('\n').slice(2).join('\n');
const server=createServer((req,res)=>{
  if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(js);}
  else res.end(`<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Card interaction test</title><style>${globalCss}\n${css}\nbody{display:block}main{max-width:1200px;margin:auto;padding:24px}</style></head><body><main id="root"></main><script src="/app.js"></script></body></html>`);
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'msedge',headless:true});
const checks=[];
try {
  const context=await browser.newContext();const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const controls=page.locator('.achievement-flip-control');
  await expect(controls).toHaveCount(6);
  await expect(page.locator('.achievement-card a')).toHaveCount(0);
  for(const [width,columns] of [[1440,3],[768,2],[360,1],[320,1]]){
    await page.setViewportSize({width,height:1000});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.equal(await page.locator('.achievement-grid').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length),columns);
    const heights=await page.locator('.achievement-perspective').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().height));
    assert.ok(Math.max(...heights)-Math.min(...heights)<1);
    assert.ok(await page.locator('.achievement-card').evaluateAll(els=>els.every(el=>Math.abs(el.getBoundingClientRect().height-el.querySelector('.achievement-perspective').getBoundingClientRect().height)<1)));
    checks.push({width,columns,equalHeights:true,overflow:false});
  }
  await controls.first().click();await expect(controls.first()).toHaveAttribute('aria-pressed','true');await expect(controls.nth(1)).toHaveAttribute('aria-pressed','false');
  await expect(page.locator('.achievement-front').first()).toHaveAttribute('inert','');
  await expect(page.locator('.achievement-back').first()).toHaveAttribute('aria-hidden','false');
  await controls.first().press('Space');await expect(controls.first()).toHaveAttribute('aria-pressed','false');
  await controls.first().press('Enter');await expect(controls.first()).toHaveAttribute('aria-pressed','true');
  await page.evaluate(()=>window.updateResults());await expect(page.locator('.achievement-back').first()).toContainText('Corrected School');await expect(page.locator('.achievement-back').first()).not.toContainText('School A');
  await controls.nth(3).click();await expect(page.locator('.achievement-back').nth(3)).toContainText('Results awaited');
  const violations=(await new AxeBuilder({page}).include('.achievement-grid').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations;
  assert.deepEqual(violations,[]);
  await page.emulateMedia({reducedMotion:'reduce'});await controls.first().click();await controls.first().click();
  assert.equal(await page.locator('.achievement-rotor').first().evaluate(el=>getComputedStyle(el).transform),'none');
  await page.setViewportSize({width:1440,height:1000});
  await mkdir('verification-evidence/achievement-cards',{recursive:true});
  await page.screenshot({path:'verification-evidence/achievement-cards/desktop.png',fullPage:true});
  assert.deepEqual(errors,[]);
  checks.push({mouseKeyboard:true,independent:true,correction:true,perCardLinksRemoved:true,noLinkSpace:true,reducedMotion:true,axeViolations:0,errors});
  const touch=await browser.newContext({hasTouch:true,viewport:{width:390,height:844}});const mobile=await touch.newPage();await mobile.goto(`http://127.0.0.1:${server.address().port}`);
  await mobile.locator('.achievement-flip-control').first().tap();await expect(mobile.locator('.achievement-flip-control').first()).toHaveAttribute('aria-pressed','true');checks.push({touch:true});await touch.close();
  await writeFile('verification-evidence/achievement-cards/report.json',JSON.stringify(checks,null,2));
  console.log(JSON.stringify(checks));
} finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
