> Historical dual-upload report. The current workflow is direct Drive only; see [the current report](gallery-drive-only-report.md).

# Dual gallery verification — 2026-10-28

Code is implemented and accepted by the existing development Convex deployment,
`quiet-chickadee-449`. Live Google success paths remain blocked by folder access.

| Check | Result |
| --- | --- |
| `npm test` | 42 tests passed across 7 files |
| `npx tsc --noEmit` / `npm run lint` | Passed, including ESLint |
| `npm run build` | Next.js production build passed |
| `npx convex dev --once` | Schema/index validation and function deployment passed |
| `git diff --check` | Passed |
| `VERIFY_BASE_URL=http://localhost:3211 node scripts/verify-gallery.mjs` | Real browser checks passed against the production server |

Automated tests cover paginated Drive import, supported MIME/size checks, pending defaults
in both folders, repeat imports and duplicate approval, leases, explicit consent,
OAuth refresh and missing config, service-account My Drive rejection, Shared Drive write
capability checks, actual multipart upload construction, idempotent upload retries, failed
upload finalization, ordinary/anonymous/revoked authorization, image proxy privacy,
replacement checks, concurrent hide/review changes, trashed files, and incomplete/failed
listing behavior. Mocked Google responses are used for these success/failure scenarios.

The independent read-only review found consent-preview races, legacy duplicate publication,
and re-publication after moving a file back into Incoming. These were fixed and covered by
regression tests. Review confirmed no remaining important finding in those fixes. Initially
empty filtered admin pages load further pages automatically, retaining legacy draft/hidden
aliases. A reviewer's checksum changing remounts the editor and clears its consent checkbox.

Real browser evidence confirms:

- Anonymous upload receives HTTP 401.
- Public Snapshots loads with the reactive Convex gallery query.
- A real active Clerk admin can open Pending, Approved, Rejected and Upload.
- File selection alone does not enable Upload; explicit consent is required.
- Protected Sync Now completes and exposes the current Google error reactively.
- An authenticated synthetic image upload reports the inaccessible-folder error; nothing
  is published and Google receives no file bytes because folder validation fails first.
- Axe WCAG checks pass on the Upload view, with no desktop/mobile horizontal overflow
  and no browser JavaScript errors. The mobile screenshot was visually inspected.

Local evidence is in ignored `verification-evidence/gallery.json`, `gallery-desktop.png`,
`gallery-mobile.png` and `gallery-pending.png`. The browser script reuses an existing test
admin, creates no users/roles, and revokes its temporary Clerk session afterward.

## Remaining infrastructure blockers

Google service-account token exchange succeeds. The configured Approved folder returns
HTTP **404 `notFound`**, and the folder ID and credentials match between local server and
development Convex env. Correct the ID or share the folder with the configured identity.
OAuth is absent. For actual personal My Drive writes, configure the three new OAuth
variables; alternatively use a writable Workspace Shared Drive. See
[the complete setup guide](gallery-drive-setup.md).

Successful real Google upload, real multi-page folder import, ID-preserving folder move,
and public delivery of a consent-cleared real test image could not be certified against
this inaccessible folder. Those paths have automated integration coverage and an explicit
manual acceptance procedure in the setup guide. No school photos were published.

The backend was deployed only to the existing development deployment. Production backend
and frontend deployment remain an operator step. Existing staged and concurrent workspace
changes were preserved. One unrelated build blocker in the concurrently edited login
page was corrected: Clerk's unsupported `colorTextSecondary` theme key was replaced by
the installed version's `colorMutedForeground` key, preserving its chosen color.
