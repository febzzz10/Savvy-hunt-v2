import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isApprovedDriveImage, MAX_IMAGE_BYTES } from "@/lib/drive-validation";
import { driveFolders, driveToken, driveMetadata, driveRequest } from "@/lib/drive-server";
export const runtime = "nodejs";
// 60 s is within the function-duration cap of every Vercel plan; the platform default is not guaranteed to cover a 15 MB Drive download.
export const maxDuration = 60;
const IMAGE_HEADERS = { "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox", "cross-origin-resource-policy": "same-origin" };
// Errors are never cacheable, so a withdrawn photo cannot be kept alive by a cached failure.
const reply = (status: number, body: string) => new Response(body, { status, headers: { "cache-control": "private, no-store" } });
// Convex rejects an id that is malformed or belongs to another table before the query runs; that is a missing photo, not an outage.
const isRejectedItemId = (error: unknown) => error instanceof Error && /ArgumentValidationError|does not match validator|does not match the table name/i.test(error.message);
// The verified MD5 identifies the exact approved bytes, so it is the entity tag.
const etagFor = (verifiedMd5Checksum: string) => `"${verifiedMd5Checksum}"`;
// Owner-approved 2026-11-28 (agent.md section 7): the Vercel CDN may serve a checksum-keyed public image for up to 120 s,
// so a withdrawn photo can stay visible that long. Browsers ignore s-maxage and still revalidate on every use.
const CDN_CACHE_CONTROL = "public, max-age=0, s-maxage=120";
const matchesEtag = (header: string | null, etag: string) => Boolean(header) && header!.split(",").some(candidate => { const value = candidate.trim(); return value === "*" || value.replace(/^W\//, "") === etag; });
type Verified = { ok: true; bytes: Buffer<ArrayBuffer>; mimeType: string } | { ok: false; status: 404 | 502 };
const inFlight = new Map<string, Promise<Verified>>();
// Fetch from Drive and verify metadata, size and downloaded-byte checksum. Publication is rechecked per request by the caller.
async function downloadVerified(item: { driveFileId: string; verifiedMd5Checksum?: string }, preview: boolean): Promise<Verified> {
  const folders = driveFolders(), access = await driveToken(), metadata = await driveMetadata(access, item.driveFileId);
  if (!(isApprovedDriveImage(metadata, folders.approved) || (preview && isApprovedDriveImage(metadata, folders.incoming))) || metadata.md5Checksum !== item.verifiedMd5Checksum) return { ok: false, status: 404 };
  const media = await driveRequest(access, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.driveFileId)}?alt=media&supportsAllDrives=true`);
  const reader = media.body?.getReader();
  if (!reader) return { ok: false, status: 502 };
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_IMAGE_BYTES) { await reader.cancel(); return { ok: false, status: 404 }; }
    chunks.push(value);
  }
  const bytes = Buffer.concat(chunks);
  // Verify media bytes too: metadata and media fetches can race a replacement.
  if (createHash("md5").update(bytes).digest("hex") !== item.verifiedMd5Checksum) return { ok: false, status: 404 };
  return { ok: true, bytes, mimeType: metadata.mimeType! };
}
export async function GET(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    if (!/^[a-zA-Z0-9_-]+$/.test(itemId)) return reply(404, "Not found");
    const url = process.env.NEXT_PUBLIC_CONVEX_URL, proxySecret = process.env.GALLERY_PROXY_SECRET;
    const preview = request.nextUrl.searchParams.get("preview") === "true";
    if (!url || !proxySecret) return reply(503, "Unavailable");
    const convex = new ConvexHttpClient(url);
    let item: { driveFileId: string; verifiedMd5Checksum?: string } | null;
    if (preview) {
      const session = await auth();
      if (!session.userId) return reply(401, "Unauthorized");
      const token = await session.getToken({ template: "convex" });
      if (!token) return reply(401, "Unauthorized");
      convex.setAuth(token);
      if (!await convex.query(api.admins.getSelf, {})) return reply(403, "Forbidden");
      item = await convex.query(api.gallery.getPreviewItem, { itemId: itemId as Id<"galleryItems"> });
    } else item = await convex.query(api.gallery.getApprovedItem, { itemId: itemId as Id<"galleryItems">, proxySecret });
    if (!item) return reply(404, "Not found");
    // Public images revalidate on every use: the approval check above has just passed, so an unchanged checksum means
    // the browser already holds the exact approved bytes and nothing more needs to be fetched from Drive.
    const etag = !preview && item.verifiedMd5Checksum ? etagFor(item.verifiedMd5Checksum) : undefined;
    // Only the exact URL `?v=<current verified checksum>` is CDN-cacheable: any other query string (cache-busting
    // parameters, a stale version, none at all) stays private so it cannot fill the CDN or serve other bytes.
    const cacheControl = etag && request.nextUrl.search === `?v=${item.verifiedMd5Checksum}` ? CDN_CACHE_CONTROL : "private, no-cache";
    if (etag && matchesEtag(request.headers.get("if-none-match"), etag)) return new Response(null, { status: 304, headers: { etag, "cache-control": cacheControl, "x-content-type-options": IMAGE_HEADERS["x-content-type-options"], "cross-origin-resource-policy": IMAGE_HEADERS["cross-origin-resource-policy"] } });
    // Public requests for the same approved bytes share one Drive download; admin previews never do.
    const load = () => downloadVerified(item!, preview);
    const key = `${itemId}:${item.driveFileId}:${item.verifiedMd5Checksum}`;
    let shared = preview ? undefined : inFlight.get(key);
    if (!shared) {
      shared = load();
      if (!preview) { const settled = shared; inFlight.set(key, settled); const clear = () => { if (inFlight.get(key) === settled) inFlight.delete(key); }; settled.then(clear, clear); }
    }
    const verified = await shared;
    if (!verified.ok) return reply(verified.status, verified.status === 404 ? "Not found" : "Unavailable");
    const { bytes, mimeType } = verified, size = bytes.length;
    if (!preview) {
      const current = await convex.query(api.gallery.getApprovedItem, { itemId: itemId as Id<"galleryItems">, proxySecret });
      if (!current || current.verifiedMd5Checksum !== item.verifiedMd5Checksum || current.driveFileId !== item.driveFileId) return reply(404, "Not found");
    }
    return new Response(bytes, { headers: { "content-type": mimeType, "cache-control": etag ? cacheControl : "private, no-store", ...(etag ? { etag } : {}), ...IMAGE_HEADERS, "content-length": String(size) } });
  } catch (error) {
    if (isRejectedItemId(error)) return reply(404, "Not found");
    console.warn("gallery.image_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
    return reply(503, "Unavailable");
  }
}
