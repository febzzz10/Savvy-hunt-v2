// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { getFunctionName } from "convex/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), approved: vi.fn(), preview: vi.fn(), self: vi.fn(), token: vi.fn(), metadata: vi.fn(), request: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
vi.mock("../lib/drive-server", async importOriginal => ({ ...await importOriginal<typeof import("../lib/drive-server")>(), driveToken: mocks.token, driveMetadata: mocks.metadata, driveRequest: mocks.request }));
import { GET, maxDuration } from "../app/api/gallery/[itemId]/image/route";
import { MAX_IMAGE_BYTES } from "../lib/drive-validation";
const md5 = (data: Uint8Array | string) => createHash("md5").update(data).digest("hex");
const bytes = Buffer.from("verified-image-bytes"), checksum = md5(bytes);
const fileId = "drive_photo_123456789012345", secret = "proxy-secret-value-123";
const approvedItem = (verifiedMd5Checksum = checksum) => ({ driveFileId: fileId, verifiedMd5Checksum });
const driveFile = (data: Uint8Array = bytes, extra: Record<string, unknown> = {}) => ({ id: fileId, mimeType: "image/png", size: String(data.length), parents: ["approved"], md5Checksum: md5(data), ...extra });
const params = { params: Promise.resolve({ itemId: "item" }) };
const get = (query = "", headers: Record<string, string> = {}) => GET(new NextRequest(`http://localhost/api/gallery/item/image${query}`, { headers }), params);
const headersOf = (response: Response) => Object.fromEntries(response.headers.entries());
const driveCalls = () => mocks.token.mock.calls.length + mocks.metadata.mock.calls.length + mocks.request.mock.calls.length;
const convexValidationError = () => new Error('ArgumentValidationError: Value does not match validator.\nPath: .itemId\nValue: "xyz"\nValidator: v.id("galleryItems")');
let warn: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://test.convex.cloud"); vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "approved"); vi.stubEnv("GOOGLE_DRIVE_INCOMING_FOLDER_ID", "incoming"); vi.stubEnv("GALLERY_PROXY_SECRET", secret);
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.query.mockImplementation(async (reference, args) => {
    const name = getFunctionName(reference);
    if (name === "gallery:getApprovedItem") return mocks.approved(args);
    if (name === "gallery:getPreviewItem") return mocks.preview(args);
    if (name === "admins:getSelf") return mocks.self(args);
    throw new Error(`Unexpected Convex function ${name}`);
  });
  mocks.auth.mockResolvedValue({ userId: "admin", getToken: vi.fn().mockResolvedValue("clerk-token") });
  mocks.self.mockResolvedValue({ role: "editor" }); mocks.approved.mockResolvedValue(approvedItem()); mocks.preview.mockResolvedValue(approvedItem());
  mocks.token.mockResolvedValue("drive-token"); mocks.metadata.mockResolvedValue(driveFile());
  mocks.request.mockImplementation(async () => new Response(bytes));
});
afterEach(() => { vi.unstubAllEnvs(); warn.mockRestore(); });
describe("Controlled photo proxy: public delivery", () => {
  it("declares a maxDuration that fits every Vercel plan", () => { expect(maxDuration).toBe(60); });
  it("keeps unapproved images private", async () => {
    mocks.approved.mockResolvedValue(null);
    const result = await get();
    expect(result.status).toBe(404); expect(driveCalls()).toBe(0);
  });
  it("delivers verified bytes with exact revalidation headers and no raw Drive URL or secret", async () => {
    const result = await get();
    expect(result.status).toBe(200); expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
    expect(headersOf(result)).toEqual({ "cache-control": "private, no-cache", "content-length": String(bytes.length), "content-security-policy": "default-src 'none'; sandbox", "content-type": "image/png", "cross-origin-resource-policy": "same-origin", etag: `"${checksum}"`, "x-content-type-options": "nosniff" });
    expect(JSON.stringify(headersOf(result))).not.toContain(secret); expect(JSON.stringify(headersOf(result))).not.toContain("googleapis");
    expect(mocks.approved).toHaveBeenCalledWith({ itemId: "item", proxySecret: secret });
  });
  it("answers a matching If-None-Match with 304 and makes no Drive call at all", async () => {
    const result = await get("", { "if-none-match": `"${checksum}"` });
    expect(result.status).toBe(304); expect(await result.text()).toBe("");
    expect(headersOf(result)).toEqual({ "cache-control": "private, no-cache", "cross-origin-resource-policy": "same-origin", etag: `"${checksum}"`, "x-content-type-options": "nosniff" });
    expect(driveCalls()).toBe(0); expect(mocks.token).not.toHaveBeenCalled(); expect(mocks.approved).toHaveBeenCalledTimes(1);
  });
  it.each([[`W/"${checksum}"`], [`"other", "${checksum}"`], [`"other",W/"${checksum}"`], ["*"]])("treats %s as a match", async header => {
    expect((await get("", { "if-none-match": header })).status).toBe(304); expect(driveCalls()).toBe(0);
  });
  it.each([['"stale"'], [checksum], [""], ['"other", "another"']])("does not treat %j as a match", async header => {
    expect((await get("", { "if-none-match": header })).status).toBe(200);
  });
  it("serves 200 with the new ETag when the approved checksum changes", async () => {
    const replacement = Buffer.from("replacement-bytes-after-reapproval"), next = md5(replacement);
    mocks.approved.mockResolvedValue(approvedItem(next)); mocks.metadata.mockResolvedValue(driveFile(replacement)); mocks.request.mockImplementation(async () => new Response(replacement));
    const result = await get("", { "if-none-match": `"${checksum}"` });
    expect(result.status).toBe(200); expect(result.headers.get("etag")).toBe(`"${next}"`); expect(Buffer.from(await result.arrayBuffer())).toEqual(replacement);
  });
  it("returns 404, never 304, once the photo is withdrawn", async () => {
    expect((await get("", { "if-none-match": `"${checksum}"` })).status).toBe(304);
    mocks.approved.mockResolvedValue(null); mocks.token.mockClear();
    const result = await get("", { "if-none-match": `"${checksum}"` });
    expect(result.status).toBe(404); expect(result.headers.get("etag")).toBeNull(); expect(result.headers.get("cache-control")).toBe("private, no-store"); expect(driveCalls()).toBe(0);
  });
  it("blocks replaced bytes, moved files, a metadata checksum mismatch and approval withdrawn while downloading", async () => {
    mocks.request.mockResolvedValueOnce(new Response("replacement"));
    expect((await get()).status).toBe(404);
    mocks.metadata.mockResolvedValueOnce(driveFile(bytes, { parents: ["other"] }));
    expect((await get()).status).toBe(404);
    mocks.metadata.mockResolvedValueOnce(driveFile(bytes, { md5Checksum: md5("a different file") })); mocks.request.mockClear();
    expect((await get()).status).toBe(404); expect(mocks.request).not.toHaveBeenCalled();
    mocks.approved.mockResolvedValueOnce(approvedItem()).mockResolvedValueOnce(null);
    expect((await get()).status).toBe(404);
    mocks.approved.mockResolvedValueOnce(approvedItem()).mockResolvedValueOnce(approvedItem(md5("re-approved with other bytes")));
    expect((await get()).status).toBe(404);
  });
  it("refuses an oversized file reported by metadata without downloading it", async () => {
    mocks.metadata.mockResolvedValue(driveFile(bytes, { size: String(MAX_IMAGE_BYTES + 1) }));
    expect((await get()).status).toBe(404); expect(mocks.request).not.toHaveBeenCalled();
  });
  it("refuses and cancels a stream that exceeds MAX_IMAGE_BYTES even when metadata understates it", async () => {
    const chunk = new Uint8Array(4_000_000); let pulled = 0, cancelled = false;
    mocks.request.mockImplementation(async () => new Response(new ReadableStream({ pull(controller) { pulled += 1; controller.enqueue(chunk); }, cancel() { cancelled = true; } })));
    const result = await get();
    expect(result.status).toBe(404); expect(cancelled).toBe(true); expect(pulled).toBeLessThanOrEqual(Math.ceil(MAX_IMAGE_BYTES / chunk.length) + 1);
  });
});
describe("Controlled photo proxy: bad input and configuration", () => {
  it.each([["bad id"], ["a.b"], ["..%2Fsecret"], ["id;drop"], [""]])("returns 404 without contacting Convex for malformed id %j", async itemId => {
    const result = await GET(new NextRequest("http://localhost/api/gallery/x/image"), { params: Promise.resolve({ itemId }) });
    expect(result.status).toBe(404); expect(mocks.query).not.toHaveBeenCalled(); expect(warn).not.toHaveBeenCalled();
  });
  it("returns 404 without a warning when Convex rejects the id (wrong table or invalid format)", async () => {
    mocks.approved.mockRejectedValue(convexValidationError()); mocks.preview.mockRejectedValue(convexValidationError());
    const publicResult = await get(), previewResult = await get("?preview=true");
    expect(publicResult.status).toBe(404); expect(previewResult.status).toBe(404);
    expect(warn).not.toHaveBeenCalled(); expect(driveCalls()).toBe(0);
  });
  it("still reports genuine backend failures as 503 with a warning", async () => {
    mocks.approved.mockRejectedValue(new Error("FORBIDDEN"));
    const result = await get();
    expect(result.status).toBe(503); expect(result.headers.get("cache-control")).toBe("private, no-store");
    expect(warn).toHaveBeenCalledWith("gallery.image_unavailable", { message: "FORBIDDEN" });
  });
  it("reports Drive failures as 503", async () => {
    mocks.token.mockRejectedValue(new Error("Drive down"));
    expect((await get()).status).toBe(503);
  });
  it.each([["GALLERY_PROXY_SECRET"], ["NEXT_PUBLIC_CONVEX_URL"]])("returns 503 and contacts nothing when %s is unset", async name => {
    vi.stubEnv(name, "");
    expect((await get()).status).toBe(503); expect((await get("?preview=true")).status).toBe(503);
    expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.auth).not.toHaveBeenCalled(); expect(driveCalls()).toBe(0);
  });
});
describe("Controlled photo proxy: admin preview", () => {
  it("returns 401 without a session or without a Convex token", async () => {
    mocks.auth.mockResolvedValueOnce({ userId: null });
    expect((await get("?preview=true")).status).toBe(401);
    mocks.auth.mockResolvedValueOnce({ userId: "someone", getToken: vi.fn().mockResolvedValue(null) });
    expect((await get("?preview=true")).status).toBe(401);
    expect(mocks.query).not.toHaveBeenCalled(); expect(driveCalls()).toBe(0);
  });
  it("returns 403 for a signed-in user who is not an active admin", async () => {
    mocks.self.mockResolvedValue(null);
    expect((await get("?preview=true")).status).toBe(403);
    expect(mocks.preview).not.toHaveBeenCalled(); expect(driveCalls()).toBe(0);
  });
  it("stays private and no-store, never sends an ETag, and ignores If-None-Match", async () => {
    const result = await get("?preview=true", { "if-none-match": `"${checksum}"` });
    expect(result.status).toBe(200);
    expect(headersOf(result)).toEqual({ "cache-control": "private, no-store", "content-length": String(bytes.length), "content-security-policy": "default-src 'none'; sandbox", "content-type": "image/png", "cross-origin-resource-policy": "same-origin", "x-content-type-options": "nosniff" });
    expect(mocks.preview).toHaveBeenCalledWith({ itemId: "item" }); expect(mocks.approved).not.toHaveBeenCalled();
  });
  it("may preview files still in the Incoming folder, which the public route refuses", async () => {
    mocks.metadata.mockResolvedValue(driveFile(bytes, { parents: ["incoming"] }));
    expect((await get("?preview=true")).status).toBe(200);
    expect((await get()).status).toBe(404);
  });
});
describe("Controlled photo proxy: request coalescing", () => {
  const getItem = (itemId: string, query = "") => GET(new NextRequest(`http://localhost/api/gallery/${itemId}/image${query}`), { params: Promise.resolve({ itemId }) });
  /** Holds the Drive media download open until released, so concurrent requests overlap. */
  const holdDownload = (data: Buffer<ArrayBuffer> = bytes) => { let release!: () => void; const gate = new Promise<void>(resolve => { release = resolve; }); mocks.request.mockImplementation(async () => { await gate; return new Response(data); }); return release; };
  it("downloads once for a burst of concurrent requests and still serves every visitor", async () => {
    const release = holdDownload();
    const burst = Array.from({ length: 5 }, () => get());
    await vi.waitFor(() => expect(mocks.approved).toHaveBeenCalledTimes(5));
    await vi.waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1));
    release();
    const results = await Promise.all(burst);
    expect(results.map(result => result.status)).toEqual([200, 200, 200, 200, 200]);
    for (const result of results) expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
    expect(mocks.token).toHaveBeenCalledTimes(1); expect(mocks.metadata).toHaveBeenCalledTimes(1); expect(mocks.request).toHaveBeenCalledTimes(1);
    expect(mocks.approved).toHaveBeenCalledTimes(10); // each visitor still rechecks publication before receiving bytes
  });
  it("blocks every waiter when approval is withdrawn during the shared download", async () => {
    const release = holdDownload();
    const burst = Array.from({ length: 4 }, () => get());
    await vi.waitFor(() => expect(mocks.approved).toHaveBeenCalledTimes(4));
    mocks.approved.mockResolvedValue(null); release();
    expect((await Promise.all(burst)).map(result => result.status)).toEqual([404, 404, 404, 404]);
  });
  it("shares a refusal without trusting the bytes: replaced file means 404 for all, from one download", async () => {
    const release = holdDownload(Buffer.from("replacement"));
    const burst = [get(), get(), get()];
    await vi.waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(1)); release();
    expect((await Promise.all(burst)).map(result => result.status)).toEqual([404, 404, 404]);
    expect(mocks.request).toHaveBeenCalledTimes(1);
  });
  it("does not share work between different photos", async () => {
    const other = Buffer.from("a different photo entirely");
    mocks.approved.mockImplementation(async ({ itemId }: { itemId: string }) => itemId === "a" ? { driveFileId: "file_a", verifiedMd5Checksum: checksum } : { driveFileId: "file_b", verifiedMd5Checksum: md5(other) });
    mocks.metadata.mockImplementation(async (_token: string, id: string) => id === "file_a" ? driveFile(bytes) : driveFile(other));
    mocks.request.mockImplementation(async (_token: string, url: string) => new Response(url.includes("file_a") ? bytes : other));
    const [a, b] = await Promise.all([getItem("a"), getItem("b")]);
    expect(Buffer.from(await a.arrayBuffer())).toEqual(bytes); expect(Buffer.from(await b.arrayBuffer())).toEqual(other);
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
  it("does not share work across different approved checksums of the same photo", async () => {
    const reapproved = Buffer.from("same photo, new approved bytes");
    // Call order for two overlapping requests: initial A, initial B, recheck A, recheck B.
    mocks.approved.mockResolvedValueOnce(approvedItem()).mockResolvedValueOnce(approvedItem(md5(reapproved))).mockResolvedValueOnce(approvedItem()).mockResolvedValueOnce(approvedItem(md5(reapproved)));
    mocks.metadata.mockResolvedValueOnce(driveFile(bytes)).mockResolvedValueOnce(driveFile(reapproved));
    mocks.request.mockResolvedValueOnce(new Response(bytes)).mockResolvedValueOnce(new Response(reapproved));
    const [first, second] = await Promise.all([get(), get()]);
    expect(first.status).toBe(200); expect(second.status).toBe(200); expect(second.headers.get("etag")).toBe(`"${md5(reapproved)}"`);
    expect(mocks.request).toHaveBeenCalledTimes(2);
  });
  it("keeps nothing after a download completes: the next request fetches and verifies afresh", async () => {
    expect((await get()).status).toBe(200); expect((await get()).status).toBe(200);
    expect(mocks.request).toHaveBeenCalledTimes(2); expect(mocks.metadata).toHaveBeenCalledTimes(2);
  });
  it("shares a Drive failure as 503 and clears it so the next request retries", async () => {
    let fail = true;
    mocks.request.mockImplementation(async () => { await Promise.resolve(); if (fail) throw new Error("Drive timeout"); return new Response(bytes); });
    const burst = await Promise.all([get(), get(), get()]);
    expect(burst.map(result => result.status)).toEqual([503, 503, 503]); expect(mocks.request).toHaveBeenCalledTimes(1);
    fail = false;
    expect((await get()).status).toBe(200);
  });
  it("never coalesces admin previews", async () => {
    const release = holdDownload();
    const burst = Array.from({ length: 3 }, () => get("?preview=true"));
    await vi.waitFor(() => expect(mocks.request).toHaveBeenCalledTimes(3)); release();
    expect((await Promise.all(burst)).map(result => result.status)).toEqual([200, 200, 200]);
  });
});
describe("Controlled photo proxy: checksum-keyed CDN caching (owner-approved 2026-11-28)", () => {
  const PUBLIC = "public, max-age=0, s-maxage=120";
  it("lets the CDN cache only the exact checksum-keyed URL, for 120 seconds, never longer", async () => {
    const result = await get(`?v=${checksum}`);
    expect(result.status).toBe(200);
    expect(headersOf(result)).toEqual({ "cache-control": PUBLIC, "content-length": String(bytes.length), "content-security-policy": "default-src 'none'; sandbox", "content-type": "image/png", "cross-origin-resource-policy": "same-origin", etag: `"${checksum}"`, "x-content-type-options": "nosniff" });
    expect(result.headers.get("cache-control")).not.toMatch(/stale-while-revalidate|stale-if-error|immutable/);
  });
  it("keeps the 304 consistent with the cacheable 200", async () => {
    const result = await get(`?v=${checksum}`, { "if-none-match": `"${checksum}"` });
    expect(result.status).toBe(304); expect(result.headers.get("cache-control")).toBe(PUBLIC); expect(driveCalls()).toBe(0);
  });
  it.each([[""], ["?v=stale-checksum"], [`?v=${checksum}&cachebust=1`], [`?cachebust=1&v=${checksum}`], [`?v=${checksum.toUpperCase()}`], [`?v=${checksum}&preview=false`], ["?v="]])("never lets the CDN cache %j", async query => {
    const result = await get(query);
    expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toBe("private, no-cache");
  });
  it("serves the current approved bytes, not the stale version's, when the URL carries an outdated checksum", async () => {
    const replacement = Buffer.from("re-approved-bytes"), next = md5(replacement);
    mocks.approved.mockResolvedValue(approvedItem(next)); mocks.metadata.mockResolvedValue(driveFile(replacement)); mocks.request.mockImplementation(async () => new Response(replacement));
    const result = await get(`?v=${checksum}`);
    expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toBe("private, no-cache"); expect(Buffer.from(await result.arrayBuffer())).toEqual(replacement);
  });
  it("never publicly caches previews, errors or withdrawn photos, even with a valid version", async () => {
    expect((await get(`?preview=true&v=${checksum}`)).headers.get("cache-control")).toBe("private, no-store");
    mocks.approved.mockResolvedValue(null);
    const withdrawn = await get(`?v=${checksum}`);
    expect(withdrawn.status).toBe(404); expect(withdrawn.headers.get("cache-control")).toBe("private, no-store");
    mocks.approved.mockResolvedValue(approvedItem()); mocks.token.mockRejectedValue(new Error("Drive down"));
    const failed = await get(`?v=${checksum}`);
    expect(failed.status).toBe(503); expect(failed.headers.get("cache-control")).toBe("private, no-store");
    mocks.token.mockResolvedValue("drive-token"); mocks.request.mockImplementation(async () => new Response("replacement"));
    const replaced = await get(`?v=${checksum}`);
    expect(replaced.status).toBe(404); expect(replaced.headers.get("cache-control")).toBe("private, no-store");
  });
});
