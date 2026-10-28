// Server-only: imported by Next server routes and Convex actions, never client components.
import { IMAGE_MIME_TYPES, type DriveMetadata } from "./drive-validation";

const API = "https://www.googleapis.com/drive/v3/files";
const FIELDS = "id,name,createdTime,mimeType,size,parents,trashed,md5Checksum,driveId";
export class DriveError extends Error {
  constructor(message: string, public status = 503) { super(message); }
}
export function driveFolders() {
  const approved = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim();
  if (!approved) throw new DriveError("Gallery Drive folder is not configured: set GOOGLE_DRIVE_FOLDER_ID in Convex and the Next.js server environment.");
  const incoming = process.env.GOOGLE_DRIVE_INCOMING_FOLDER_ID?.trim() || approved;
  for (const id of [approved, incoming]) if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new DriveError("Drive folder configuration must contain folder IDs, not URLs.");
  return { approved, incoming };
}
function b64url(bytes: Uint8Array) {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
export async function driveToken() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !key) throw new DriveError("Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY in Convex and the Next.js server environment.");
  const bytes = Uint8Array.from(atob(key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g, "")), c => c.charCodeAt(0));
  const imported = await crypto.subtle.importKey("pkcs8", bytes, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]);
  const now = Math.floor(Date.now() / 1000), encoder = new TextEncoder();
  const header = b64url(encoder.encode(JSON.stringify({ alg: "RS256", typ: "JWT" })));
  const payload = b64url(encoder.encode(JSON.stringify({ iss: email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })));
  const input = `${header}.${payload}`;
  const signature = b64url(new Uint8Array(await crypto.subtle.sign("RSASSA-PKCS1-v1_5", imported, encoder.encode(input))));
  const body = new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${input}.${signature}` });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body, cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new DriveError(`Google Drive authorization failed (${response.status}). Check the service-account email, private key and Drive API enablement.`);
  const result = await response.json() as { access_token?: string };
  if (!result.access_token) throw new DriveError("Google Drive did not return an access token.");
  return result.access_token;
}
export async function driveRequest(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, { ...init, headers: { ...init.headers, Authorization: `Bearer ${token}` }, cache: "no-store", signal: AbortSignal.timeout(60_000) });
  if (!response.ok) {
    // Only log Google's error code/reason; never tokens, request bodies or raw responses.
    const error = await response.json().catch(() => ({})) as { error?: { errors?: { reason?: string }[] } };
    const reason = error.error?.errors?.[0]?.reason;
    console.warn("gallery.drive_request_failed", { status: response.status, reason });
    throw new DriveError(`Google Drive request failed (${response.status}${reason ? `: ${reason}` : ""}). Check folder access, Drive API enablement and read permissions.`, response.status);
  }
  return response;
}
export async function driveMetadata(token: string, id: string, folder = false): Promise<DriveMetadata> {
  try {
    return await (await driveRequest(token, `${API}/${encodeURIComponent(id)}?fields=${encodeURIComponent(FIELDS)}&supportsAllDrives=true`)).json();
  } catch (error) {
    if (folder && error instanceof DriveError && error.status === 404) {
      throw new DriveError(`Google Drive folder returned 404 notFound. Verify GOOGLE_DRIVE_FOLDER_ID (or GOOGLE_DRIVE_INCOMING_FOLDER_ID when set) and share the folder directly with ${process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "the configured service account"} as Viewer. A missing folder or missing read permission produces this response. For a Workspace Shared Drive, check membership and organization sharing policies.`, 404);
    }
    throw error;
  }
}
export async function listDriveImages(token: string, folder: string, pageToken?: string) {
  const q = `'${folder}' in parents and trashed = false and (${IMAGE_MIME_TYPES.map(m => `mimeType = '${m}'`).join(" or ")})`;
  const params = new URLSearchParams({ q, fields: `nextPageToken,incompleteSearch,files(${FIELDS})`, pageSize: "100", spaces: "drive", supportsAllDrives: "true", includeItemsFromAllDrives: "true" });
  if (pageToken) params.set("pageToken", pageToken);
  const result = await (await driveRequest(token, `${API}?${params}`)).json() as { files?: DriveMetadata[]; nextPageToken?: string; incompleteSearch?: boolean };
  if (result.incompleteSearch || !Array.isArray(result.files)) throw new DriveError("Google Drive returned an incomplete listing; reconciliation was skipped. Retry Sync Now.");
  return { files: result.files, nextPageToken: result.nextPageToken };
}
