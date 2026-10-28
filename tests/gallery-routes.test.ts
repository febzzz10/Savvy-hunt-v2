// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHash } from "node:crypto";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), token: vi.fn(), metadata: vi.fn(), request: vi.fn() }));
vi.mock("@clerk/nextjs/server", () => ({ auth: mocks.auth }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
vi.mock("../lib/drive-server", async importOriginal => ({ ...await importOriginal<typeof import("../lib/drive-server")>(), driveToken: mocks.token, driveMetadata: mocks.metadata, driveRequest: mocks.request }));
import { GET } from "../app/api/gallery/[itemId]/image/route";
const bytes = Buffer.from("verified-image-bytes"), checksum = createHash("md5").update(bytes).digest("hex");
const fileId = "drive_photo_123456789012345";
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://test.convex.cloud"); vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "approved"); vi.stubEnv("GOOGLE_DRIVE_INCOMING_FOLDER_ID", "incoming"); vi.stubEnv("GALLERY_PROXY_SECRET", "proxy");
  mocks.auth.mockResolvedValue({ userId: "admin", getToken: vi.fn().mockResolvedValue("clerk-token") });
  mocks.query.mockResolvedValue({ role: "editor" }); mocks.token.mockResolvedValue("drive-token");
  mocks.metadata.mockResolvedValue({ id: fileId, mimeType: "image/png", size: String(bytes.length), parents: ["approved"], md5Checksum: checksum });
  mocks.request.mockImplementation(async () => new Response(bytes));
});
afterEach(() => vi.unstubAllEnvs());
describe("Controlled photo proxy", () => {
  const params = { params: Promise.resolve({ itemId: "item" }) };
  it("keeps draft images private and protects admin previews", async () => {
    mocks.query.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://localhost/api/gallery/item/image"), params)).status).toBe(404);
    mocks.auth.mockResolvedValueOnce({ userId: null });
    expect((await GET(new NextRequest("http://localhost/api/gallery/item/image?preview=true"), params)).status).toBe(401);
    mocks.query.mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://localhost/api/gallery/item/image?preview=true"), params)).status).toBe(403);
    expect(mocks.request).not.toHaveBeenCalled();
  });
  it("delivers verified private bytes with no-store headers", async () => {
    mocks.query.mockResolvedValue({ driveFileId: fileId, verifiedMd5Checksum: checksum });
    const result = await GET(new NextRequest("http://localhost/api/gallery/item/image"), params);
    expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toBe("private, no-store"); expect(Buffer.from(await result.arrayBuffer())).toEqual(bytes);
  });
  it("blocks replaced bytes, moved files and approval withdrawn while downloading", async () => {
    mocks.query.mockResolvedValue({ driveFileId: fileId, verifiedMd5Checksum: checksum });
    mocks.request.mockResolvedValueOnce(new Response("replacement"));
    expect((await GET(new NextRequest("http://localhost/api/gallery/item/image"), params)).status).toBe(404);
    mocks.metadata.mockResolvedValueOnce({ mimeType: "image/png", size: "10", parents: ["other"], md5Checksum: checksum });
    expect((await GET(new NextRequest("http://localhost/api/gallery/item/image"), params)).status).toBe(404);
    mocks.query.mockResolvedValueOnce({ driveFileId: fileId, verifiedMd5Checksum: checksum }).mockResolvedValueOnce(null);
    expect((await GET(new NextRequest("http://localhost/api/gallery/item/image"), params)).status).toBe(404);
  });
});
