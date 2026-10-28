import { createSign } from "node:crypto";
import { baseURL, anonymous, api, verificationAdmin, evidence } from "./phase4-support.mjs";

const result = { startedAt: new Date().toISOString(), checks: [], blockers: [] };
let admin, itemId;
try {
  const required = ["GOOGLE_DRIVE_FOLDER_ID", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY", "GALLERY_PROXY_SECRET"];
  result.localConfiguration = Object.fromEntries(required.map(k => [k, Boolean(process.env[k]?.trim())]));
  if (required.some(k => !process.env[k]?.trim())) throw new Error("Required local Drive configuration is missing");
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
  const folder = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const now = Math.floor(Date.now() / 1000), b64 = v => Buffer.from(JSON.stringify(v)).toString("base64url");
  const input = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iss: email, scope: "https://www.googleapis.com/auth/drive.readonly", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 })}`;
  const signer = createSign("RSA-SHA256"); signer.update(input);
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${input}.${signer.sign(key).toString("base64url")}` }), signal: AbortSignal.timeout(30000) });
  result.tokenStatus = response.status;
  const body = await response.json();
  if (!response.ok) throw new Error(`Google service-account authorization failed: HTTP ${response.status}`);
  const headers = { Authorization: `Bearer ${body.access_token}` };
  const folderResponse = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folder)}?fields=mimeType,trashed&supportsAllDrives=true`, { headers, signal: AbortSignal.timeout(30000) });
  result.folderStatus = folderResponse.status;
  if (!folderResponse.ok) result.blockers.push(`Configured development folder is not accessible to the service account: Drive files.get returned HTTP ${folderResponse.status}. Verify folder ID and share it with the configured service account.`);
  const listing = await fetch(`https://www.googleapis.com/drive/v3/files?${new URLSearchParams({ q: `'${folder}' in parents and trashed = false`, fields: "files(id,mimeType,size,md5Checksum),nextPageToken", pageSize: "100", supportsAllDrives: "true", includeItemsFromAllDrives: "true" })}`, { headers, signal: AbortSignal.timeout(30000) });
  const files = await listing.json();
  result.listing = { status: listing.status, visibleFiles: files.files?.length ?? 0, morePages: Boolean(files.nextPageToken) };
  if (!files.files?.length) result.blockers.push("No accessible, consent-cleared development image fixture is available. Approval, byte delivery, hide-after-approval, replacement, move/trash and unavailability cannot be verified against real images.");
  admin = await verificationAdmin();
  const edition = await anonymous.query(api.editions.getCurrent, {});
  itemId = await admin.client.mutation(api.gallery.add, { editionId: edition._id, driveFileId: `phase4_missing_${Date.now()}`, altText: "Phase 4 inaccessible development image" });
  for (const consentConfirmed of [false, true]) {
    let rejected = false;
    try { await admin.client.action(api.gallery.approve, { itemId, consentConfirmed }); }
    catch (error) { rejected = true; (result.rejections ??= []).push({ consentConfirmed, reason: error.data ?? error.message }); }
    if (!rejected) throw new Error("Nonexistent Drive image was approved");
    result.checks.push(consentConfirmed ? "Real development action rejected nonexistent Drive file with consent" : "Real development action rejected missing consent");
  }
  const publicItems = await anonymous.query(api.gallery.listApproved, { editionId: edition._id });
  if (publicItems.some(p => p._id === itemId)) throw new Error("Rejected image leaked through public gallery");
  const image = await fetch(`${baseURL}/api/gallery/${itemId}/image`);
  result.rejectedImage = { status: image.status, contentType: image.headers.get("content-type"), bytes: (await image.arrayBuffer()).byteLength };
  if (image.ok || image.headers.get("content-type")?.startsWith("image/")) throw new Error("Rejected gallery image endpoint delivered image bytes");
  result.checks.push("Rejected image absent from public gallery and image endpoint refuses delivery");
} catch (error) { result.failure = error.message; }
finally {
  if (itemId && admin) await admin.client.mutation(api.gallery.hide, { itemId }).catch(() => result.cleanupFailed = true);
  if (admin) await admin.close();
  await evidence("drive", result);
  console.log(JSON.stringify(result, null, 2));
}
if (result.failure || result.blockers.length) process.exitCode = 1;
