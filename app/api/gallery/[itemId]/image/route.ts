import { ConvexHttpClient } from "convex/browser";
import { auth } from "@clerk/nextjs/server";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { isApprovedDriveImage, MAX_IMAGE_BYTES } from "@/lib/drive-validation";
import { driveFolders, driveToken, driveMetadata, driveRequest } from "@/lib/drive-server";
export const runtime = "nodejs";
export async function GET(request: NextRequest, { params }: { params: Promise<{ itemId: string }> }) {
  try {
    const { itemId } = await params;
    if (!/^[a-zA-Z0-9_-]+$/.test(itemId)) return new Response("Not found", { status: 404 });
    const url = process.env.NEXT_PUBLIC_CONVEX_URL, proxySecret = process.env.GALLERY_PROXY_SECRET;
    const preview = request.nextUrl.searchParams.get("preview") === "true";
    if (!url || !proxySecret) return new Response("Unavailable", { status: 503 });
    const convex = new ConvexHttpClient(url);
    let item: { driveFileId: string; verifiedMd5Checksum?: string } | null;
    if (preview) {
      const session = await auth();
      if (!session.userId) return new Response("Unauthorized", { status: 401 });
      const token = await session.getToken({ template: "convex" });
      if (!token) return new Response("Unauthorized", { status: 401 });
      convex.setAuth(token);
      if (!await convex.query(api.admins.getSelf, {})) return new Response("Forbidden", { status: 403 });
      item = await convex.query(api.gallery.getPreviewItem, { itemId: itemId as Id<"galleryItems"> });
    } else item = await convex.query(api.gallery.getApprovedItem, { itemId: itemId as Id<"galleryItems">, proxySecret });
    if (!item) return new Response("Not found", { status: 404 });
    const folders = driveFolders(), access = await driveToken(), metadata = await driveMetadata(access, item.driveFileId);
    if (!(isApprovedDriveImage(metadata, folders.approved) || (preview && isApprovedDriveImage(metadata, folders.incoming))) || metadata.md5Checksum !== item.verifiedMd5Checksum) return new Response("Not found", { status: 404 });
    const media = await driveRequest(access, `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(item.driveFileId)}?alt=media&supportsAllDrives=true`);
    const reader = media.body?.getReader();
    if (!reader) return new Response("Unavailable", { status: 502 });
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_IMAGE_BYTES) { await reader.cancel(); return new Response("Not found", { status: 404 }); }
      chunks.push(value);
    }
    const bytes = Buffer.concat(chunks);
    // Verify media bytes too: metadata and media fetches can race a replacement.
    if (createHash("md5").update(bytes).digest("hex") !== item.verifiedMd5Checksum) return new Response("Not found", { status: 404 });
    if (!preview) {
      const current = await convex.query(api.gallery.getApprovedItem, { itemId: itemId as Id<"galleryItems">, proxySecret });
      if (!current || current.verifiedMd5Checksum !== item.verifiedMd5Checksum || current.driveFileId !== item.driveFileId) return new Response("Not found", { status: 404 });
    }
    return new Response(bytes, { headers: { "content-type": metadata.mimeType!, "cache-control": "private, no-store", "x-content-type-options": "nosniff", "content-security-policy": "default-src 'none'; sandbox", "content-length": String(size) } });
  } catch (error) {
    console.warn("gallery.image_unavailable", { message: error instanceof Error ? error.message : "Unknown error" });
    return new Response("Unavailable", { status: 503, headers: { "cache-control": "private, no-store" } });
  }
}
