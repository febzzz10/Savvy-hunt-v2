import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
try { process.loadEnvFile(".env.local"); } catch { /* CI may configure environment directly. */ }
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const secrets = [process.env.CLERK_SECRET_KEY, process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, process.env.GALLERY_PROXY_SECRET].filter(value => value && value.length > 16);
const hits = files.filter(file => secrets.some(secret => readFileSync(file, "utf8").includes(secret)));
const localEnvironmentTracked = files.some(file => /^\.env(?:\.|$)/.test(file) && file !== ".env.example");
console.log(JSON.stringify({ trackedFiles: files.length, configuredSecretMatches: hits.length, localEnvironmentTracked }));
if (hits.length) console.log(JSON.stringify({ filesRequiringReview: hits }));
if (hits.length || localEnvironmentTracked) process.exitCode = 1;
