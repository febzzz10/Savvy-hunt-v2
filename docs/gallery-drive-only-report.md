# Direct Google Drive gallery report — 2026-10-29

The gallery now accepts photos uploaded manually to Google Drive only. Existing Next.js,
Convex, Clerk, gallery metadata, audit history, reactive queries and the private image
proxy remain in place. No unrelated website feature was changed for this task.

## Changes

- Removed the Admin Upload tab, file picker, multipart browser workflow, Next upload route,
  Convex upload functions and upload-only helper code.
- Removed runtime OAuth-client credential handling and OAuth entries from `.env.example`.
  Tests confirm stale OAuth settings cannot select another Google identity.
- Retained service-account JWT authentication, now always requesting `drive.readonly`.
  Approval never uploads, moves or changes a Google file or its permissions.
- Retained `GOOGLE_DRIVE_FOLDER_ID` as the gallery folder and the existing optional
  `GOOGLE_DRIVE_INCOMING_FOLDER_ID` fallback to it. A separately configured Incoming folder
  requires an organizer to move files into the gallery folder manually before approval.
- Retained the existing two-minute Convex cron and protected Sync Now action.
- Retained Pending, Approved and Rejected views, explicit publication consent, approval,
  rejection, hiding, metadata editing, ordering, duplicate prevention and reconciliation.
- Retained checksum/version-bound review and private preview/public proxy verification.
- Retained all historical gallery fields, consent/approval/rejection audit, and legacy
  `source: admin` records. The historical `galleryUploads` schema table remains so removing
  the feature does not delete existing upload-intent data. No upload functions write it.
- Improved folder-404 errors to identify exact environment variables, service-account
  identity, Viewer sharing and Workspace policy checks.

## Google folder investigation

Live service-account authentication succeeded. The configured folder `Savvy-hunt` is
readable, is a folder, is not trashed, and currently contains one image in a complete
one-page listing. It is a personal My Drive folder shared with the service account;
Workspace Shared Drive ownership and OAuth are unnecessary for this read-only workflow.

Local and development Convex values match for `GOOGLE_DRIVE_FOLDER_ID`, the service-account
email/private key and `GALLERY_PROXY_SECRET`. The previously reported `404 notFound` is no
longer reproducible. This implementation did not change the folder ID or Google permissions,
so it cannot establish which external sharing/configuration change restored access.

If access fails again, open the intended folder as its organizer, check the ID, and share
it directly with `savvy-hunt@savvy-hunt.iam.gserviceaccount.com` as **Viewer**. Check the
same settings in Convex and Next/Vercel; check organizational sharing restrictions for
Workspace drives. Full instructions are in [the setup guide](gallery-drive-setup.md).

## Verification

| Check | Result |
| --- | --- |
| `npm test` | 41 tests passed across 8 files |
| `npx tsc --noEmit` | Passed |
| `npm run lint` | ESLint and TypeScript passed without warnings |
| `npm run build` | Next.js production build passed; upload API is absent |
| `npx convex dev --once` | Updated functions accepted by development deployment |
| `git diff --check` | Passed |
| Real-browser checks | Passed against the optimized frontend and real Clerk/Convex |
| Independent read-only code review | No critical or important regressions found |

Coverage includes service-account-only authentication and readonly scope, missing config,
OAuth settings being ignored, pagination/MIME/trash filtering, two-minute cron target and
Incoming fallback, pending defaults, explicit consent, unauthorized operations, duplicate
publication prevention, changed content, stale review, removed/trashed files, failed
listings, manual separate-folder handling, legacy metadata and the private proxy.

Real-browser checks verified that the removed upload endpoint returns 404; active admins
retain all three review views without an Upload tab or file input; Sync Now completes
successfully; and an actual Drive photo stays Pending with consent unconfirmed. Its public
image request returns 404 while the authenticated private preview returns HTTP 200 image
bytes with `private, no-store`. Verify and publish stays disabled without consent. The
gallery passed axe WCAG checks, desktop/mobile overflow checks and browser JavaScript
error checks. The fixture was not approved or published.

Sanitized local evidence is in ignored `verification-evidence/gallery-drive-only.json`
and `verification-evidence/gallery-drive-only-preflight.json`. The browser script is
`scripts/verify-gallery.mjs`; set `VERIFY_BASE_URL` to the running localhost server. Its
temporary Clerk session is revoked afterward, and it creates no users or roles.

## Deployment and limits

The updated backend is deployed to existing **development** deployment
`dev:quiet-chickadee-449`. No production deployment or Google permission change was made.
There is no current folder-access blocker in development. Production still needs the
matching service-account/folder configuration and its own deployment.

Real public delivery after approval was not exercised because no explicit publication
consent was established for the available photo. Automated tests cover consent-confirmed
approval and verified public delivery. All new manually uploaded photos still require an
administrator's real consent verification before publication.
