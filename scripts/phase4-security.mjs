import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";

process.loadEnvFile(".env.local");
const git = args => execFileSync("git", args, { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
const names = ["CLERK_SECRET_KEY", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "GALLERY_PROXY_SECRET", "GOOGLE_OAUTH_CLIENT_SECRET", "GOOGLE_OAUTH_REFRESH_TOKEN", "CONVEX_DEPLOY_KEY", "ADMIN_BOOTSTRAP_SECRET"];
const values = names.map(k => process.env[k]).filter(v => v && v.length > 16);
const containsSecret = text => values.some(v => text.includes(v) || text.includes(v.replaceAll("\\n", "\n"))) || /(?:sk_(?:test|live)_[A-Za-z0-9]{20,}|-----BEGIN (?:RSA )?PRIVATE KEY-----[\r\n]+[A-Za-z0-9+/=]{20,})/.test(text);
const tracked = git(["ls-files", "-z"]).split("\0").filter(Boolean);
const result = { startedAt: new Date().toISOString(), scannedConfiguredSecretNames: names, indexFindings: [], worktreeFindings: [], historyFindings: [], environmentTracked: tracked.filter(p => /^\.env(?:\.|$)/.test(p) && p !== ".env.example"), exclusions: ["Ignored local environment, dependencies, build/cache output and verification artifacts are not treated as source files."] };
for (const path of tracked) if (containsSecret(git(["show", `:${path}`]))) result.indexFindings.push(path);
for (const path of git(["ls-files", "--cached", "--others", "--exclude-standard", "-z"]).split("\0").filter(Boolean)) {
  try { if (containsSecret(readFileSync(path, "utf8"))) result.worktreeFindings.push(path); } catch { /* Removed tracked file. */ }
}
const objects = new Set();
for (const commit of git(["rev-list", "--all"]).trim().split("\n").filter(Boolean)) {
  for (const line of git(["ls-tree", "-r", commit]).trim().split("\n").filter(Boolean)) {
    const match = line.match(/^\d+ blob ([a-f0-9]+)\t(.+)$/);
    if (match && !objects.has(match[1])) {
      objects.add(match[1]);
      if (containsSecret(git(["cat-file", "blob", match[1]]))) result.historyFindings.push({ commit, path: match[2] });
    }
  }
}
result.uniqueHistoryBlobs = objects.size;
result.ignoreChecks = {};
for (const path of [".env.local", ".env.production", "verification-evidence/probe.json", "service-account.json", "private-key.pem"]) {
  try { git(["check-ignore", "--quiet", path]); result.ignoreChecks[path] = true; } catch { result.ignoreChecks[path] = false; }
}
await mkdir("verification-evidence", { recursive: true });
await writeFile("verification-evidence/phase4-security.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
if (result.indexFindings.length || result.worktreeFindings.length || result.historyFindings.length || result.environmentTracked.length) process.exitCode = 1;
