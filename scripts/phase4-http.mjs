import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { baseURL, evidence } from "./phase4-support.mjs";

const routes = ["/", "/scoreboard", "/schedule", "/results", "/snapshots", "/about"];
const result = { startedAt: new Date().toISOString(), target: baseURL, requests: 500, concurrency: 20, routes, failures: [], limitations: ["Local production-build HTML responses only; excludes asset/image downloads, browser rendering, Vercel infrastructure and real-user latency."] };
let next = 0, bytes = 0;
const times = [], started = performance.now();
await Promise.all(Array.from({ length: result.concurrency }, async () => {
  while (next < result.requests) {
    const index = next++, route = routes[index % routes.length], start = performance.now();
    try {
      const response = await fetch(`${baseURL}${route}`, { signal: AbortSignal.timeout(15000) });
      const body = await response.text();
      assert.equal(response.status, 200);
      assert.ok(body.includes("Savvy Hunt") || body.includes("SAVVY HUNT"));
      bytes += Buffer.byteLength(body);
    } catch (error) { result.failures.push({ route, message: error.message }); }
    times.push(performance.now() - start);
  }
}));
times.sort((a, b) => a - b);
Object.assign(result, { completed: times.length, elapsedMs: Math.round(performance.now() - started), bytes, p50Ms: Math.round(times[Math.floor(times.length * .5)]), p95Ms: Math.round(times[Math.floor(times.length * .95)]), maxMs: Math.round(times.at(-1)) });
await evidence("http", result);
console.log(JSON.stringify(result, null, 2));
if (result.failures.length) process.exitCode = 1;
