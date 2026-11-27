import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { driveFolders, driveToken, driveMetadata, driveRequest, invalidateDriveToken, listDriveImages } from "../lib/drive-server";
import { serviceAccountTestKey } from "./service-account-fixture";
const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
beforeEach(async () => {
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "gallery@test.iam.gserviceaccount.com");
  vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", await serviceAccountTestKey());
  invalidateDriveToken();
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.useRealTimers(); invalidateDriveToken(); });
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
    expect(url.searchParams.get("corpora")).toBeNull();
    expect(url.searchParams.get("q")).toContain("trashed = false");
    expect(url.searchParams.get("q")).toContain("image/jpeg");
    fetcher.mockResolvedValue(response({ files: [], incompleteSearch: true }));
    await expect(listDriveImages("access", "incoming")).rejects.toThrow("incomplete listing");
  });
  it("scopes listings to a Shared Drive when the folder reports a driveId", async () => {
    const fetcher = vi.fn().mockResolvedValue(response({ files: [] })); vi.stubGlobal("fetch", fetcher);
    await listDriveImages("access", "folder", undefined, "shared_drive_123");
    const url = new URL(fetcher.mock.calls[0][0]);
    expect(url.searchParams.get("corpora")).toBe("drive");
    expect(url.searchParams.get("driveId")).toBe("shared_drive_123");
    expect(url.searchParams.get("includeItemsFromAllDrives")).toBe("true");
    expect(url.searchParams.get("supportsAllDrives")).toBe("true");
  });
  it("explains a folder 404 with exact sharing and configuration instructions", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: { errors: [{ reason: "notFound" }] } }, 404)));
    await expect(driveMetadata("access", "gallery", true)).rejects.toThrow("Viewer");
    await expect(driveMetadata("access", "gallery", true)).rejects.toThrow("GOOGLE_DRIVE_FOLDER_ID");
    await expect(driveMetadata("access", "gallery", true)).rejects.toThrow("gallery@test.iam.gserviceaccount.com");
  });
  it("logs a failed file lookup with its resource id and operation, never credentials", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response({ error: { errors: [{ reason: "notFound" }] } }, 404)));
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await expect(driveMetadata("secret-token", "stale_file_123456789012")).rejects.toThrow("stale_file_123456789012");
    await expect(driveMetadata("secret-token", "stale_file_123456789012")).rejects.toThrow("deleted, trashed");
    expect(warn).toHaveBeenCalledWith("gallery.drive_request_failed", { operation: "files.get", resourceId: "stale_file_123456789012", status: 404, reason: "notFound" });
    expect(JSON.stringify(warn.mock.calls)).not.toContain("secret-token");
    warn.mockRestore();
  });
});

describe("Drive access-token cache", () => {
  const token = (access: string, expires_in?: number) => response({ access_token: access, ...(expires_in === undefined ? {} : { expires_in }) });
  const mint = (...results: Response[]) => { const fetcher = vi.fn(); for (const result of results) fetcher.mockResolvedValueOnce(result); vi.stubGlobal("fetch", fetcher); return fetcher; };
  it("reuses one token for repeated calls instead of signing a new JWT each time", async () => {
    const fetcher = mint(token("first", 3600), token("second", 3600));
    expect(await driveToken()).toBe("first"); expect(await driveToken()).toBe("first"); expect(await driveToken()).toBe("first");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("refreshes about five minutes before the token expires", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-27T10:00:00Z"));
    const fetcher = mint(token("first", 3600), token("second", 3600));
    expect(await driveToken()).toBe("first");
    vi.setSystemTime(new Date("2026-11-27T10:54:00Z")); expect(await driveToken()).toBe("first");
    expect(fetcher).toHaveBeenCalledTimes(1);
    vi.setSystemTime(new Date("2026-11-27T10:56:00Z")); expect(await driveToken()).toBe("second");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("assumes a one-hour lifetime when Google omits expires_in", async () => {
    vi.useFakeTimers({ toFake: ["Date"] }); vi.setSystemTime(new Date("2026-11-27T10:00:00Z"));
    const fetcher = mint(token("first"), token("second"));
    await driveToken(); vi.setSystemTime(new Date("2026-11-27T10:50:00Z")); expect(await driveToken()).toBe("first");
    vi.setSystemTime(new Date("2026-11-27T10:57:00Z")); expect(await driveToken()).toBe("second");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("shares one in-flight request between concurrent callers", async () => {
    let release!: (value: Response) => void;
    const fetcher = vi.fn().mockReturnValue(new Promise<Response>(resolve => { release = resolve; })); vi.stubGlobal("fetch", fetcher);
    const callers = Promise.all([driveToken(), driveToken(), driveToken(), driveToken()]);
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(1));
    release(token("shared", 3600));
    expect(await callers).toEqual(["shared", "shared", "shared", "shared"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it("does not cache a failed request, and later callers mint a fresh token", async () => {
    const fetcher = mint(response({}, 401), token("recovered", 3600));
    await expect(driveToken()).rejects.toThrow("authorization failed (401)");
    expect(await driveToken()).toBe("recovered");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("shares a failure with concurrent callers but does not keep it", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(response({}, 503)).mockResolvedValueOnce(token("later", 3600)); vi.stubGlobal("fetch", fetcher);
    const settled = await Promise.allSettled([driveToken(), driveToken(), driveToken()]);
    expect(settled.map(result => result.status)).toEqual(["rejected", "rejected", "rejected"]);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(await driveToken()).toBe("later");
  });
  it("does not cache a response without an access token", async () => {
    const fetcher = mint(response({ expires_in: 3600 }), token("real", 3600));
    await expect(driveToken()).rejects.toThrow("did not return an access token");
    expect(await driveToken()).toBe("real");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("never serves a token minted for different credentials", async () => {
    const fetcher = mint(token("old-identity", 3600), token("new-identity", 3600));
    expect(await driveToken()).toBe("old-identity");
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "rotated@test.iam.gserviceaccount.com");
    expect(await driveToken()).toBe("new-identity");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it("still validates configuration before consulting the cache", async () => {
    mint(token("cached", 3600)); await driveToken();
    vi.stubEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL", "");
    await expect(driveToken()).rejects.toThrow("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  });
  it("drops a cached token that Drive rejects with 401, so the next caller mints a new one", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(token("revoked", 3600)).mockResolvedValueOnce(response({ error: {} }, 401)).mockResolvedValueOnce(token("fresh", 3600)); vi.stubGlobal("fetch", fetcher);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const access = await driveToken();
    await expect(driveRequest(access, "https://www.googleapis.com/drive/v3/files/x")).rejects.toThrow("(401");
    expect(await driveToken()).toBe("fresh");
    warn.mockRestore();
  });
  it("keeps the cached token when a stale token is the one Drive rejects", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(token("current", 3600)).mockResolvedValueOnce(response({ error: {} }, 401)); vi.stubGlobal("fetch", fetcher);
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await driveToken();
    await expect(driveRequest("some-older-token", "https://www.googleapis.com/drive/v3/files/x")).rejects.toThrow();
    expect(await driveToken()).toBe("current");
    warn.mockRestore();
  });
  it("never logs the token or key material", async () => {
    const spies = (["log", "info", "warn", "error", "debug"] as const).map(level => vi.spyOn(console, level).mockImplementation(() => {}));
    mint(token("super-secret-access-token", 3600), response({}, 401));
    await driveToken(); await driveToken(); invalidateDriveToken();
    await expect(driveToken()).rejects.toThrow();
    const logged = JSON.stringify(spies.flatMap(spy => spy.mock.calls));
    expect(logged).not.toContain("super-secret-access-token"); expect(logged).not.toContain("PRIVATE KEY");
    spies.forEach(spy => spy.mockRestore());
  });
});
