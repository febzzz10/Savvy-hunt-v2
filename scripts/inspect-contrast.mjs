import { chromium } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
const browser = await chromium.launch({channel:"msedge",headless:true});
try { const context=await browser.newContext();const page=await context.newPage();await page.goto("http://localhost:3000");await page.getByRole("heading",{name:"Who’s leading?"}).waitFor();const result=await new AxeBuilder({page}).withRules(["color-contrast"]).analyze();console.log(JSON.stringify(result.violations.map(item=>item.nodes.map(node=>({target:node.target,failure:node.failureSummary}))),null,2));}finally{await browser.close()}
