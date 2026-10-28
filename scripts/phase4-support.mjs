import assert from "node:assert/strict";
import { createClerkClient } from "@clerk/backend";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import { mkdir, writeFile } from "node:fs/promises";

process.loadEnvFile(".env.local");
assert.equal(process.env.CONVEX_DEPLOYMENT, "dev:quiet-chickadee-449");
assert.equal(new URL(process.env.NEXT_PUBLIC_CONVEX_URL).hostname, "quiet-chickadee-449.ap-southeast-2.convex.cloud");
assert.match(process.env.CLERK_SECRET_KEY ?? "", /^sk_test_/);
assert.ok(!process.env.CONVEX_DEPLOY_KEY, "Remove deployment-key overrides before verification");
export const baseURL = process.env.VERIFY_BASE_URL ?? "http://localhost:3000";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(baseURL).hostname));
export const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
export const anonymous = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
export { api };

export async function verificationAdmin() {
  for (const user of (await clerk.users.getUserList({ query: "savvy-verification-", limit: 30 })).data) {
    const session = await clerk.sessions.createSession({ userId: user.id });
    const client = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
    const refresh = async () => client.setAuth((await clerk.sessions.getToken(session.id, "convex")).jwt);
    try {
      await refresh();
      if ((await client.query(api.admins.getSelf, {}))?.role === "super_admin") {
        return { user, session, client, refresh, close: () => clerk.sessions.revokeSession(session.id) };
      }
    } catch { /* Try another development verification identity. */ }
    await clerk.sessions.revokeSession(session.id);
  }
  throw new Error("Existing development verification super admin required; no bootstrap changes were made");
}

export async function evidence(name, value) {
  await mkdir("verification-evidence", { recursive: true });
  await writeFile(`verification-evidence/phase4-${name}.json`, JSON.stringify(value, null, 2));
}
