import { createClerkClient } from "@clerk/backend";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
process.loadEnvFile(".env.local");
assert.match(process.env.CONVEX_DEPLOYMENT, /^dev:quiet-chickadee-449/);
assert.match(process.env.CLERK_SECRET_KEY, /^sk_test_/);
const clerk=createClerkClient({secretKey:process.env.CLERK_SECRET_KEY}),client=new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL),anonymous=new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
const evidence={target:"dev:quiet-chickadee-449",checks:[]};let session,browser,settings,editionId;
const record=message=>{evidence.checks.push(message);console.log(message)};
try{
  for(const user of (await clerk.users.getUserList({query:"savvy-verification-",limit:30})).data){const candidate=await clerk.sessions.createSession({userId:user.id});client.setAuth((await clerk.sessions.getToken(candidate.id,"convex")).jwt);if(await client.query(api.admins.getSelf,{})){session=candidate;break}await clerk.sessions.revokeSession(candidate.id)}
  assert.ok(session,"Verification admin required");
  editionId=(await client.query(api.editions.getCurrent,{}))._id;
  browser=await chromium.launch({channel:"msedge",headless:true});const context=await browser.newContext();context.setDefaultTimeout(15000);const page=await context.newPage();await page.goto("http://localhost:3000");
  const title=`Verification announcement ${Date.now()}`;
  const id=await client.mutation(api.announcements.save,{editionId,title,body:"Live operational verification"});
  assert.ok(!(await anonymous.query(api.announcements.listPublic,{editionId})).some(item=>item._id===id));
  await client.mutation(api.announcements.setStatus,{id,status:"published"});await page.getByRole("heading",{name:title,exact:true}).waitFor();
  await client.mutation(api.announcements.setStatus,{id,status:"hidden"});await page.getByRole("heading",{name:title,exact:true}).waitFor({state:"detached"});record("Announcement draft hidden; publish and hide propagated to public home without refresh");
  settings=await client.query(api.siteSettings.getPublic,{editionId});
  const tagline=`Verification About ${Date.now()}`;await page.goto("http://localhost:3000/about");
  await client.mutation(api.siteSettings.update,{editionId,eventTitle:settings.eventTitle,tagline,contactInfo:settings.contactInfo});await page.getByText(tagline,{exact:true}).waitFor();record("About content update propagated without refresh");
  await client.mutation(api.siteSettings.update,{editionId,eventTitle:settings.eventTitle,tagline:settings.tagline,contactInfo:settings.contactInfo});settings=null;
  const photo=await client.mutation(api.gallery.add,{editionId,driveFileId:`verification_missing_${Date.now()}`,altText:"Verification unavailable Drive image"});
  await assert.rejects(client.action(api.gallery.approve,{itemId:photo,consentConfirmed:false}));
  await assert.rejects(client.action(api.gallery.approve,{itemId:photo,consentConfirmed:true}));
  assert.ok(!(await anonymous.query(api.gallery.listApproved,{editionId})).some(item=>item._id===photo));
  await client.mutation(api.gallery.hide,{itemId:photo});record("Live gallery refused approval without consent and for an inaccessible Drive file; no image published");
  const response=await fetch(`http://localhost:3000/api/gallery/${photo}/image`);assert.notEqual(response.status,200);record(`Unapproved image endpoint returned ${response.status}, with no image bytes`);
  await page.goto("http://localhost:3000/schedule");await page.getByRole("combobox").first().selectOption("completed");await page.getByText("No events match these filters.").waitFor();record("Public schedule status filter works");
}catch(error){evidence.failure=error.message;console.error(error.message);process.exitCode=1}finally{if(settings&&editionId)await client.mutation(api.siteSettings.update,{editionId,eventTitle:settings.eventTitle,tagline:settings.tagline,contactInfo:settings.contactInfo}).catch(()=>{});if(session)await clerk.sessions.revokeSession(session.id).catch(()=>{});if(browser)await browser.close();await mkdir("verification-evidence",{recursive:true});await writeFile("verification-evidence/content.json",JSON.stringify(evidence,null,2))}
