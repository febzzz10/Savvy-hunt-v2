# Direct Google Drive gallery setup

Organizers upload photos manually into a Google Drive folder. Savvy Hunt reads that folder
using a Google service account. The website has no photo-upload form, upload endpoint or
Google OAuth credential requirement. All Google Drive operations use the `drive.readonly`
scope, including approval and the private image proxy.

## Required configuration

| Variable | Purpose | Location |
| --- | --- | --- |
| `GOOGLE_DRIVE_FOLDER_ID` | Gallery folder ID, not its URL | Convex deployment env and Next.js/Vercel server env |
| `GOOGLE_DRIVE_INCOMING_FOLDER_ID` | Optional Incoming folder; defaults to gallery when absent/empty | Both environments, if used |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Identity that must have read access | Both environments |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Matching service-account private key | Both environments |
| `GALLERY_PROXY_SECRET` | Existing random secret shared with the proxy | Both environments, identical |

The folder ID is environment configuration, not a `siteSettings` database field. Local
`.env.local`, Vercel env and Convex deployment env are separate settings. Keep values matched
for the deployment being used. Never prefix private credentials with `NEXT_PUBLIC_`.

No `GOOGLE_OAUTH_*` values are needed or read by the gallery. Old OAuth environment values
may be removed from your deployment settings. Existing Clerk configuration and the active
admin allowlist remain required for gallery management.

## Google Cloud and folder sharing

1. Enable **Google Drive API** in the Google Cloud project owning the service account.
2. Configure `GOOGLE_SERVICE_ACCOUNT_EMAIL` and the matching private key on both servers.
   The private key accepts actual newlines or escaped `\n` sequences.
3. Open the intended gallery folder in Google Drive as its owner or an authorized organizer.
4. Choose **Share**, add the exact service-account email as a person, and grant **Viewer**.
   The current development identity is `savvy-hunt@savvy-hunt.iam.gserviceaccount.com`.
   Explicitly share with that identity; signing in with your own Google account is different.
5. Copy only the ID after `/folders/` in the folder URL to `GOOGLE_DRIVE_FOLDER_ID`.
6. Leave `GOOGLE_DRIVE_INCOMING_FOLDER_ID` unset for the usual single-folder workflow.
7. Add supported image files directly to that folder. Confirm the service account inherits
   read access to those files; check restricted/limited-access child items separately.
8. Restart/redeploy Next after changing its environment. Set Convex values on the intended
   deployment through Dashboard Settings > Environment Variables or the Convex CLI.
9. Sign into the admin gallery and use **Sync Now**. New photos must appear as Pending.

A personal **My Drive folder shared with the service account is supported**. Service-account
file ownership limits do not apply to this read-only workflow: organizers own their uploads.
A Workspace **Shared Drive** is also supported. Its membership and organization sharing
policies must allow the service-account identity to read the folder and photos. No write
role, Content manager role or ownership transfer is needed for Savvy Hunt.

## Single-folder and optional separate Incoming workflows

With Incoming unset, manually upload directly into `GOOGLE_DRIVE_FOLDER_ID`, sync, review,
confirm publication consent and approve. Approval does not move the file or change its
Google permissions. Supported types: JPEG, PNG, WebP, GIF and AVIF, up to 15 MB.

If a separate Incoming folder is explicitly configured, both folders are scanned and all
new files enter Pending. An organizer must move the desired photo **manually in Google Drive**
into the gallery folder, then sync/review again before approval. Give the service account
Viewer access to both folders. The application never moves or uploads Google files.

## Consent, audit and publication

Every new Drive import is Pending with consent unconfirmed, even when uploaded into the
gallery folder. Folder location alone never establishes consent. An active administrator
must review the private preview and explicitly verify publication permission, including
required permission for identifiable students, before publication.

Approval verifies the reviewed checksum and review version, current folder membership,
MIME type, size and trash state. The administrator and consent/approval times are recorded.
A changed photo cannot be published with the confirmation from an older preview.

The existing Convex queries update the public gallery reactively. Public image requests use
the existing controlled proxy; it verifies current publication, folder metadata and actual
image bytes, rechecks approval before delivery and returns `private, no-store` responses.
Pending previews require an authenticated active Clerk/Convex administrator. Keep the Drive
folder private; public Drive link sharing is unnecessary.

Legacy `source: admin` metadata, gallery records, approval fields, audit logs and historical
upload-intent records are retained. No active upload function writes new upload intents.
Legacy draft/hidden records still appear under Pending/Rejected. Metadata editing, rejection,
hiding, ordering and Sync Now remain available.

## Synchronization and safe reconciliation

The existing Convex cron runs every two minutes for the current edition. Sync Now is
protected by the existing admin allowlist. Page continuations and per-edition leases are
unchanged. Files are matched by Drive ID across folders/editions to prevent new duplicate
entries. A legacy duplicate cannot be published alongside another approved entry.

Reconciliation starts only after successful, complete listings. Missing files are checked
individually. Trash, removal, unsupported content or leaving the configured folders marks
the record unavailable and withdraws publication without deleting audit history. Content
changes invalidate prior consent and verification. Moving an approved file back into a
separate Incoming folder also withdraws publication. Reappearance never republishes it.
Transient failures abort synchronization and display an error instead of deleting records.

## Diagnosing 404 notFound

Google returns 404 both when a file/folder does not exist and when the requesting identity
cannot read it. A successful token exchange proves the credentials work; it does not prove
folder access. Savvy Hunt already sends `supportsAllDrives=true` on folder/file requests.

For a folder 404:

1. Confirm the configured ID opens the intended folder in the organizer's Drive account.
   Check the folder is not deleted/trashed and the value is an ID rather than a complete URL.
2. Share it directly with the exact configured service-account email as **Viewer**.
3. Check Incoming separately if configured; a different folder needs its own access.
4. For a Workspace Shared Drive, ask its manager to check membership, limited-access folders
   and organizational external-sharing restrictions. Service accounts are separate identities.
5. Confirm local/Vercel and the intended Convex deployment use the same ID and identity.
6. Retry Sync Now. Folder-access errors now name the configuration variables, service-account
   identity and Viewer sharing requirement.

On **2026-10-29 (Asia/Calcutta)** the previously failing development folder `Savvy-hunt`
was readable using the configured service account. `files.get` succeeded, confirmed an
untrashed folder, and a complete image listing succeeded. Local and development Convex
folder ID, service-account email/key and proxy secret matched. The old 404 is no longer
reproducible; no Google permission or folder-ID change was made by this implementation.

Official references: [Google Drive error handling](https://developers.google.com/workspace/drive/api/guides/handle-errors),
[folder sharing](https://developers.google.com/workspace/drive/api/guides/manage-sharing),
[files.list](https://developers.google.com/workspace/drive/api/reference/rest/v3/files/list).
