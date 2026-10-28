import { execFileSync } from "node:child_process";
try { process.loadEnvFile(".env.local"); } catch { /* CI may configure environment directly. */ }
const files = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean);
const secrets = [process.env.CLERK_SECRET_KEY, process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY, process.env.GALLERY_PROXY_SECRET].filter(value => value && value.length > 16);
const hits = files.filter(file => {const staged=execFileSync("git",["show",`:${file}`],{encoding:"utf8"});return secrets.some(secret=>staged.includes(secret));});
let committedSecretMatches = 0;
const head = execFileSync("git",["rev-parse","--verify","HEAD"],{encoding:"utf8",stdio:["ignore","pipe","ignore"]}).trim();
for(const file of execFileSync("git",["ls-tree","-r","--name-only",head],{encoding:"utf8"}).trim().split("\n").filter(Boolean)){const contents=execFileSync("git",["show",`${head}:${file}`],{encoding:"utf8"});if(secrets.some(secret=>contents.includes(secret)))committedSecretMatches++;}
const localEnvironmentTracked = files.some(file => /^\.env(?:\.|$)/.test(file) && file !== ".env.example");
console.log(JSON.stringify({ trackedFiles: files.length, configuredSecretMatches: hits.length, committedSecretMatches, localEnvironmentTracked }));
if (hits.length) console.log(JSON.stringify({ filesRequiringReview: hits }));
if (hits.length || committedSecretMatches || localEnvironmentTracked) process.exitCode = 1;
