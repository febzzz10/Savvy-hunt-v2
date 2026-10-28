import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { driveFolders, driveToken, driveMetadata, listDriveImages } from "../lib/drive-server";
import { serviceAccountTestKey } from "./service-account-fixture";
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(async () => {
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "gallery@test.iam.gserviceaccount.com");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", await serviceAccountTestKey());
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Read-only service-account Drive integration", () => {
  it("uses the existing gallery folder and defaults Incoming to it", () => {
    vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "");
    expect(driveFolders).toThrow("GOOGLE_DRIVE_FOLDER_ID");
    vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "gallery"); vi.stubEnv("GOOGLE_DRIVE_INCOMING_FOLDER_ID", "");
    expect(driveFolders()).toEqual({ approved: "gallery", incoming: "gallery" });
    vi.stubEnv("GOOGLE_DRIVE_FOLDER_ID", "https://drive.google.com/drive/folders/gallery");
    expect(driveFolders).toThrow("folder IDs, not URLs");
  });
  it("uses only service-account credentials and readonly scope even if stale OAuth values exist", async () => {
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "old-client"); vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "old-secret"); vi.stubEnv("GOOGLE_OAUTH_REFRESH_TOKEN", "old-refresh");
    const fetcher = vi.fn().mockResolvedValue(response({ access_token: "access" })); vi.stubGlobal("fetch", fetcher);
    expect(await driveToken()).toBe("access");
    const body = fetcher.mock.calls[0][1].body as URLSearchParams;
    expect(body.get("grant_type")).toBe("urn:ietf:params:oauth:grant-type:jwt-bearer");
    expect(body.has("refresh_token")).toBe(false);
    const encoded = body.get("assertion")!.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const claims = JSON.parse(atob(encoded));
    expect(claims.iss).toBe("gallery@test.iam.gserviceaccount.com");
    expect(claims.scope).toBe("https://www.googleapis.com/auth/drive.readonly");
  });
  it("requires the service-account identity even if OAuth is configured", async () => {
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", ""); vi.stubEnv("GOOGLE_OAUTH_CLIENT_ID", "old-client");
    vi.stubEnv("GOOGLE_OAUTH_CLIENT_SECRET", "old-secret"); vi.stubEnv("GOOGLE_OAUTH_REFRESH_TOKEN", "old-refresh");
    const fetcher = vi.fn().mockResolvedValue(response({ access_token: "wrong-identity" })); vi.stubGlobal("fetch", fetcher);
    await expect(driveToken()).rejects.toThrow("GOOGLE_SERVICE_ACCOUNT_EMAIL");
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("surfaces authentication failure without returning credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({}, 401)));
    await expect(driveToken()).rejects.toThrow("authorization failed (401)");
  });
  it("filters images, excludes trash and sends pagination and Shared Drive flags", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ files: [], nextPageToken: "next" })); vi.stubGlobal("fetch", fetcher);
    expect((await listDriveImages("access", "incoming", "page2")).nextPageToken).toBe("next");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("pageToken")).toBe("page2");
    expect(url.searchParams.get("includeItemsFromAllDrives")).toBe("true");
    expect(url.searchParams.get("supportsAllDrives")).toBe("true");
    expect(url.searchParams.get("q")).toContain("trashed = false");
    expect(url.searchParams.get("q")).toContain("image/jpeg");
    fetcher.mockResolvedValue(response({ files: [], incompleteSearch: true }));
    await expect(listDriveImages("access", "incoming")).rejects.toThrow("incomplete listing");
  });
  it("explains a folder 404 with exact sharing and configuration instructions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: { errors: [{ reason: "notFound" }] } }, 404)));
    await expect(driveMetadata("access", "gallery", true)).rejects.toThrow("Viewer");
    await expect(driveMetadata("access", "gallery", true)).rejects.toThrow("GOOGLE_DRIVE_FOLDER_ID");
    await expect(driveMetadata("access", "gallery", true)).rejects.toThrow("gallery@test.iam.gserviceaccount.com");
  });
});
