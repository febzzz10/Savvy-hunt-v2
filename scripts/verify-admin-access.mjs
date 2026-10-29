import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { makeFunctionReference } from "convex/server";
import { ConvexHttpClient } from "convex/browser";
import { api, anonymous, clerk, verificationAdmin } from "./phase4-support.mjs";

// Nonproduction checks only, guarded by phase4-support. No allowlist grants.
const checks = [];
let admin, user, session;
try {
  admin = await verificationAdmin();
  assert.equal((await admin.client.query(api.admins.getSelf, {}))?.role, "super_admin");
  const edition = await anonymous.query(api.editions.getCurrent, {});
  assert.ok(edition, "Existing development edition required");
  await admin.client.query(api.schools.listAdmin, { editionId: edition._id });
  await admin.client.query(api.events.listAdmin, { editionId: edition._id });
  checks.push("Existing approved account obtains a real Clerk convex JWT and reads protected dashboard data");

  user = await clerk.users.createUser({
    emailAddress: [`savvy-admin-denial-${Date.now()}+clerk_test@example.com`],
    password: randomBytes(32).toString("base64url"),
    firstName: "Temporary unlisted test account",
  });
  session = await clerk.sessions.createSession({ userId: user.id });
  const regular = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  regular.setAuth((await clerk.sessions.getToken(session.id, "convex")).jwt);
  const key = await regular.query(api.admins.getIdentityKey, {});
  assert.ok(key?.startsWith(`${process.env.CLERK_JWT_ISSUER_DOMAIN}|`));
  assert.ok(key?.endsWith(`|${user.id}`));
  checks.push("Unlisted real Clerk account can read only its own identity key");

  for (const [name, caller] of [["anonymous", anonymous], ["unlisted Clerk user", regular]]) {
    assert.equal(await caller.query(api.admins.getSelf, {}), null);
    const expected = name === "anonymous" ? /UNAUTHENTICATED/ : /FORBIDDEN/;
    await assert.rejects(caller.query(api.schools.listAdmin, { editionId: edition._id }), expected);
    await assert.rejects(caller.query(api.events.listAdmin, { editionId: edition._id }), expected);
    await assert.rejects(caller.query(api.admins.listAudit, {}), expected);
    await assert.rejects(caller.mutation(api.admins.save, { authUserId: key, displayName: "Denied probe", role: "super_admin", isActive: true }), expected);
    checks.push(`${name}: dashboard reads, audit reads, and self-promotion denied`);
  }

  const bootstrap = makeFunctionReference("admins:bootstrap");
  const seal = makeFunctionReference("admins:sealBootstrap");
  for (const [name, caller] of [["anonymous", anonymous], ["signed-in unlisted user", regular], ["signed-in super admin", admin.client]]) {
    await assert.rejects(caller.mutation(bootstrap, { authUserId: key, displayName: "Denied bootstrap probe" }), /Could not find public function|internal function/i);
    await assert.rejects(caller.mutation(seal, {}), /Could not find public function|internal function/i);
    checks.push(`${name}: both internal bootstrap functions inaccessible through client API`);
  }
  assert.equal(await regular.query(api.admins.getSelf, {}), null);
} finally {
  if (session) await clerk.sessions.revokeSession(session.id);
  if (user) await clerk.users.deleteUser(user.id);
  if (admin) await admin.close();
}
const evidence = { target: "dev:quiet-chickadee-449", verifiedAt: new Date().toISOString(), checks, temporaryClerkAccountDeleted: true, allowlistGrantsMadeByVerification: 0 };
await mkdir("verification-evidence", { recursive: true });
await writeFile("verification-evidence/admin-access.json", JSON.stringify(evidence, null, 2));
console.log(JSON.stringify(evidence, null, 2));
