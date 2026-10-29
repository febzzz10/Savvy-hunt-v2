// Owner-only wrapper around the authenticated Convex CLI. No application endpoint.
// Avoids PowerShell/Windows JSON argument escaping and never handles Clerk tokens.
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

process.loadEnvFile(".env.local");
const [operation, deployment] = process.argv.slice(2);
const configured = process.env.CONVEX_DEPLOYMENT?.split(/\s+#/)[0].trim();
if (!deployment || configured !== `dev:${deployment}` || process.env.CONVEX_DEPLOY_KEY) {
  throw new Error("Specify the exact development deployment from .env.local and remove CONVEX_DEPLOY_KEY overrides. This helper never targets production.");
}
if (!["status", "bootstrap", "grant", "check"].includes(operation)) {
  throw new Error("Usage: node scripts/admin-access.mjs status|bootstrap|grant|check DEVELOPMENT_DEPLOYMENT");
}
const cli = fileURLToPath(new URL("../node_modules/convex/bin/main.js", import.meta.url));
function run(args) {
  const result = spawnSync(process.execPath, [cli, ...args, "--deployment", deployment], { encoding: "utf8", windowsHide: true });
  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout || "Convex CLI failed\n");
    process.exit(result.status ?? 1);
  }
  return result.stdout;
}
function required(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Set ${name} in this terminal first (see docs/admin-setup.md).`);
  return value;
}
function identity(tokenIdentifier) {
  const separator = tokenIdentifier.lastIndexOf("|");
  if (separator < 1 || separator === tokenIdentifier.length - 1) throw new Error("Use the complete provider-scoped identity key.");
  return JSON.stringify({ tokenIdentifier, issuer: tokenIdentifier.slice(0, separator), subject: tokenIdentifier.slice(separator + 1) });
}

console.log(`target: dev (${deployment}); operation: ${operation}`);
if (operation === "status") {
  const rows = JSON.parse(run(["data", "admins", "--format", "json", "--limit", "1000"]));
  console.log(JSON.stringify({
    inspectedAdminRows: rows.length,
    activeSuperAdmins: rows.filter(row => row.isActive && row.role === "super_admin").map(row => ({ displayName: row.displayName, identityKey: row.authUserId })),
    note: "Existing allowlist rows block bootstrap. Keys are public identifiers, not login credentials.",
  }, null, 2));
} else {
  const authUserId = required("SAVVY_ADMIN_IDENTITY_KEY");
  if (operation === "check") {
    // This verifies the allowlist with an owner-simulated identity, not Clerk login.
    process.stdout.write(run(["run", "admins:getSelf", "{}", "--identity", identity(authUserId)]));
  } else {
    const displayName = required("SAVVY_ADMIN_DISPLAY_NAME");
    if (operation === "bootstrap") {
      process.stdout.write(run(["run", "admins:bootstrap", JSON.stringify({ authUserId, displayName })]));
    } else {
      // CLI identity simulation requires Convex deployment-owner credentials.
      // The existing mutation still enforces active-super-admin authorization.
      const actor = identity(required("SAVVY_ADMIN_ACTOR_KEY"));
      process.stdout.write(run(["run", "admins:save", JSON.stringify({ authUserId, displayName, role: "super_admin", isActive: true }), "--identity", actor]));
    }
  }
}
