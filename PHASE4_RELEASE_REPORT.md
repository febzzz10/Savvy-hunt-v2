# Savvy Hunt — Phase 4 release verification

**Date:** 28 October 2026
**Verdict: NOT APPROVED for production or an official event.**

The existing application builds, passes its automated suite, supports real development
Clerk/Convex authentication and scoring, and passed a short 500-client subscription
rehearsal. Frontend accessibility and operational controls were improved. Google
service-account authentication succeeds, but the configured Drive folder returns
**404**. Real approved-image publication, delivery and takedown remain unverified.
The previously exposed Clerk secret must be rotated, and organizer/infrastructure
rehearsals remain. **No production deployment was performed.**

## Scope and environment

- Read `FINAL_VERIFICATION_REPORT.md`, `FINAL_IMPLEMENTATION_REPORT.md`,
  `IMPLEMENTATION_NOTES.md`, `README.md`, `prd.md`, `techspc.md`, `database.md`,
  `appflow.md`, `architectur.md`, `plan.md` and project/Convex agent guidelines.
- Backend: development `quiet-chickadee-449`, regional endpoint in `ap-southeast-2`.
  Clerk keys and instance were confirmed development/test. No deployment-key override
  was configured during these checks.
- Frontend: existing Next development server at `http://localhost:3000`, plus an
  optimized `next build` served locally with `next start -p 3100`. Neither is a Vercel deployment.
- Node.js 24.11.1; Next.js 16.4.3; Vitest 5.0.5; isolated headless Microsoft Edge
  browser contexts. Existing installed dependencies were used; a clean `npm ci` was
  not repeated during Phase 4.
- Verification scripts pin development identity/URL and reject production targets.
  Sanitized evidence is under ignored `verification-evidence/`; secrets were not
  included in reports, screenshots or source.
- Scoring, authentication protections, official revision pointers and transaction
  boundaries were preserved by this frontend/verification work.

**Concurrent workspace changes:** independent gallery upload/sync changes appeared
during verification, including optional gallery metadata, upload/sync tables, actions,
cron, server routes and tests. They were preserved and included in the final local
build/test snapshot. This report does not represent approval of that expanded schema
or write workflow. Review the entire release diff and `docs/gallery-drive-setup.md`;
real positive Drive verification is still blocked for those changes as well.

## 1. Google Drive: verified findings and exact blocker

Drive verification was the first integration check. All four existing variables are
present locally and in development Convex, and their values match across the two:
`GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`,
`GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, and `GALLERY_PROXY_SECRET`.

| Real external check | Observed result |
|---|---|
| Service-account JWT token exchange, read-only Drive scope | HTTP **200**, access token obtained |
| `files.get` for configured folder, `supportsAllDrives=true` | HTTP **404** |
| List non-trashed children of configured folder | HTTP **200**, **0 files**, no next page |
| Approval without consent | Rejected by development backend |
| Approval of unverified missing-file draft with consent | Rejected; latest backend requires a synced current preview |
| Public approved gallery lookup for that draft | Draft absent |
| Public image endpoint for that draft | HTTP **404**, 9-byte `Not found` text, no image bytes |

An empty listing is not successful folder verification after `files.get` returned
404. A wrong/deleted ID and lack of access are both possible; the response does not
establish which one applies. This interpretation follows Google's
[Drive error documentation](https://developers.google.com/workspace/drive/api/guides/handle-errors).

**Required organizer action:** verify the folder ID and share that private folder with
the service-account email configured in the server environment. Supply a consent-cleared
development image and organizer-controlled disposable fixtures for replacement,
wrong-folder, unsupported, oversized, trashed/deleted and revoked-sharing scenarios.
Update environment settings only; do not put keys in source or chat. No public sharing
workaround or replacement authentication architecture was introduced for this verification.

| Image acceptance scenario | Status |
|---|---|
| Real Google service-account authorization | Passed |
| Missing consent / unverified draft stays private | Passed against live development backend |
| Approved file validation, public display and actual image bytes | **Blocked by folder access / missing fixtures** |
| Hide an actually approved image and verify reactive removal plus endpoint denial | **Blocked** |
| Unsupported, oversized, wrong-folder, trashed real files | **Blocked**; local validation tests pass only |
| Changed bytes, hide during download and stale approval | Local controlled-response/in-memory tests pass; **real Drive scenarios blocked** |
| Removed file or sharing loss and real-image fallback | **Blocked**; do not infer success from an empty gallery |

The latest negative approval message is “Sync this photo and review its current preview
before approving.” This proves the draft is refused, not that its Drive bytes were
inspected. Earlier in this session, before the concurrent gallery review change, the
real approval action reached Drive and received 404 for the missing file.

## 2. Frontend review and improvements

Retained the existing green/cream styling, routing and reactive data flow. Changes:

- Fixed long identity-key overflow on `/admin/admins` at 320 px.
- Fixed insufficient contrast in Clerk's visible development attribution without
  hiding it. Kept the staff sign-in form within the mobile viewport.
- Added current-page navigation, an admin Overview link, visible Clerk sign-out,
  named navigation landmarks, keyboard skip links and focusable main content.
- Added an editor permission message for direct visits to super-admin pages; backend
  authorization remains the security boundary.
- Added connection/offline/reconnecting status without polling or replacing cached
  scores. Offline state responds to browser network events, not just socket timeouts.
- Made initial connection status consistent across server rendering and hydration;
  a browser regression test caught and then verified removal of hydration exceptions.
- Added a route error boundary with retry guidance and instructions to inspect the
  official result before retrying an uncertain publication.
- Kept larger controls, visible button focus, category selection state and wrapping
  content within the existing visual system.

The final optimized-build audit covered **26 distinct public/admin routes at 320, 768
and 1440 px: 84 route/role/viewport checks**, with zero recorded page exceptions,
horizontal overflow or axe WCAG 2 A/AA and 2.1 A/AA violations. This includes all six
category boards, a real event/result-editor route, and setup/access-request pages in
both signed-in and signed-out states. The earlier 78-check run also passed.

Inspected mobile admin overview, mobile login and desktop gallery screenshots.
The current gallery visibly reports the real 404 sync failure and has no fabricated
approved photographs. Keyboard testing confirms skip-to-content focus, route changes
and current-link state. Offline warning and recovery pass without refreshing.
Automated scans and targeted keyboard checks do **not** establish manual screen-reader,
real-device Safari/Android or full assistive-technology acceptance.

## 3. Staff authentication and recovery

`scripts/phase4-auth.mjs` used a newly created temporary Clerk development user with a
random password and an editor allowlist entry. It drove the actual sign-in UI:

1. Incorrect password rejected.
2. Correct email/password plus Clerk's new-device email challenge accepted.
3. Real session reached the Convex-protected Events page.
4. Editor navigation omitted admin management; direct Settings navigation showed the
   explicit super-admin permission message.
5. Visible Sign out ended the browser session.
6. Forgot password → Reset your password → code preparation (HTTP **200**) → test
   verification code → password reset succeeded.
7. Recovered session reached the protected Events page.

These are **8 recorded assertions**. The script waited for reset-code preparation
before entering the OTP; earlier automation attempted verification too soon and
received a provider error. No ticket session replaced the password/recovery test.
The reserved `+clerk_test` address and fixed development OTP follow
[Clerk's test-email procedure](https://clerk.com/docs/guides/development/testing/test-emails-and-phones).
No real staff email or SMS was sent. The temporary user was deleted and its allowlist
entry revoked; audit history remains.

**Still required:** organizer-approved staff roster, real mailbox recovery/delivery,
MFA/OAuth policy, lost-device recovery, backup publisher and rehearsal on actual staff
devices and production domains. Those are not established by a temporary test account.

## 4. Traffic, concurrency and reconnection

The provisional specification target is 500 visitors; no replacement organizer target
was supplied. `scripts/phase4-capacity.mjs` created **500 independent real WebSocket
clients**, each subscribing to overall standings, Category II standings, events and
one event's published results: **2,000 live subscriptions**.

Ramped 50 → 200 → 500 clients, with all clients connected at each stage. The run lasted
approximately **41 seconds**, used a small development dataset, and recorded zero
query errors. Initial subscription readiness: p50 **1,376 ms**, p95 **1,538 ms**, max
**1,918 ms**.

| Real development mutation | Recipients | Overall p50 | p95 | Maximum |
|---|---:|---:|---:|---:|
| Initial publication, 7 points | 500/500 | 1,235 ms | 3,013 ms | 5,050 ms |
| Correction to 4 points, with 50 socket closures | 500/500 | 2,047 ms | 5,218 ms | 7,662 ms |
| Revocation to 0 points | 500/500 | 1,957 ms | 6,107 ms | 9,042 ms |

Latency starts immediately before submitting the mutation, so includes network and
server time as well as update delivery. The 50 disrupted clients automatically
reconnected; all 500 were connected at completion. Revoked the fixture result,
cancelled its event and archived its school afterward; audit history was retained.

The separate production-build HTML test issued **500 requests at concurrency 20**
across six public routes: **500 completed, 0 failures**, 1,832 ms elapsed, p50 **67 ms**,
p95 **113 ms**, max **166 ms**, 5,134,948 response bytes. This measures local HTML only.

The live scoring browser rehearsal also passed with an admin and two anonymous
contexts; one spectator was offline during revocation and recovered current totals.
The dedicated interaction test verifies an offline warning within 5 seconds and live
status restoration without page refresh.

**Limits:** this is not 500 rendered browsers, a sustained soak, Vercel capacity,
Drive/image throughput, distributed mobile networks or provider quota/billing evidence.
Maximum score-update latency exceeded 9 seconds in this short rehearsal. Organizers
must accept a latency target and rehearse the official data/page/media mix on approved
hosting before event-day capacity can be certified.

## 5. Exact commands and actual results

Commands ran in this existing workspace. For Phase 4 browser/interaction/HTML tests
against the optimized frontend, PowerShell used:

```powershell
$env:VERIFY_BASE_URL='http://localhost:3100'
```

The original `verify-*.mjs` scripts use port 3000. Capacity uses development Convex
directly. Exit status 1 on Drive preflight intentionally preserves the unresolved gate.

| Command | Actual result |
|---|---|
| `npx convex env list` / `npx convex env get <name>` | Passed; values captured privately and matching status only reported |
| `npx convex codegen` | Final exit 0, generated bindings and backend TypeScript check passed |
| `npm run lint` | Final exit 0; ESLint plus full `tsc --noEmit` |
| `npm test` | Exit 0: **7 files, 42 tests passed** |
| `npm run build` | Final exit 0; compilation, TypeScript, static generation and optimization passed |
| `npm audit` | Exit 0: **0 vulnerabilities** |
| `node scripts/verify-development.mjs` | Exit 0: **13 live checks**, zero recorded admin page exceptions; real scoring/roles/concurrent publication/reconnect |
| `node scripts/verify-content.mjs` | Exit 0: **5 checks**; About restored, announcement hidden, unverified image denied |
| `node scripts/verify-browser.mjs` | Exit 0: **16 public route/viewport checks** |
| `node scripts/phase4-drive.mjs` | **Exit 1: external release blocker**; token 200, folder 404, no accessible fixtures; 3 negative/private-state checks pass |
| `node scripts/phase4-auth.mjs` | Exit 0: **8 password/sign-out/recovery/role UI checks**, real test-instance session |
| `node scripts/phase4-ui.mjs` | Final exit 0: **84 route/role/viewport checks**, no page exceptions, overflow or axe violations |
| `node scripts/phase4-interactions.mjs` | Exit 0: **5 checks**, zero page exceptions, including optimized build |
| `node scripts/phase4-capacity.mjs` | Exit 0: **500 clients**, 2,000 subscriptions, 50 reconnects, no query errors |
| `node scripts/phase4-http.mjs` | Exit 0: **500/500 local production-build HTML responses**, no failures |
| `node scripts/check-repository-secrets.mjs` | Exit 0: no configured-secret matches in index/current commit |
| `node scripts/phase4-security.mjs` | Exit 0: no findings in worktree, index or **125 unique reachable history blobs**; no local env tracked |
| `git diff --check` | Exit 0; no whitespace errors |

Initial lint/codegen failed while concurrent gallery files were partially written
(duplicate `driveToken`, circular return inference and resulting downstream types).
Later checks passed with the completed source; type checking was not disabled.
Frontend testing also caught an unsupported Clerk appearance variable, hydration
mismatch and delayed offline indicator; final build and browser evidence supersede
those failures. Failed auth attempts caused by automation selectors/timing were fixed
and rerun through real provider flows; they were not replaced with mocked sessions.

The 42-test suite contains pure validation/scoring tests, `convex-test` function tests
and server-route/Drive controlled-response tests. Those simulated external responses
are clearly separate from the real Google preflight, Clerk sessions and live Convex
tests. They do not clear the real-image acceptance gate.

## 6. Repository, environment and credential security

Git was already initialized. Generated source bindings and the dependency lockfile are
tracked. Existing staged work was preserved; this verification did not commit, push,
rewrite history or deploy production. Added ignore rules for PEM/key files and common
service-account/credentials JSON names. Environment files and local evidence remain ignored.

The current worktree/index/reachable-history scan found zero configured private-value
or selected private-key-pattern matches. Ignore probes passed for `.env.local`,
`.env.production`, evidence artifacts, `service-account.json` and `private-key.pem`.
This scan does not cover external copies, chat/history outside Git, dangling objects,
remote provider logs, or every possible credential format.

**Rotation required:** Phase 3 documented a real Clerk secret in `.env.example`.
Removing it and obtaining a clean scan does not revoke it. The Clerk account owner
must rotate/revoke that exposed key, update every executing environment, review
affected sessions/access as appropriate, and rerun authentication. Rotation was not
performed or claimed here. No evidence establishes exposure of the configured Drive
private key in the current scanned source/history.

## 7. Production handover and remaining blockers

Created `PRODUCTION_DEPLOYMENT.md`: release freeze, environment placement, distinct
preview/production credentials, Drive acceptance matrix, reviewed Vercel/Convex build
command, staff rehearsal, backups, manual tally, incident response and rollback.
It is a prepared procedure, **not an executed production rehearsal or deployment**.

Required before approval:

1. **Drive owner:** fix folder ID/access and complete all real approved/invalid/changed/
   unavailable/hide scenarios with consent-cleared disposable fixtures.
2. **Clerk owner:** rotate the previously exposed secret and reverify sessions.
3. **Organizer:** confirm scoring/placement/tie policy, public content, branding,
   schedule/venues, photo consent, admin roster and named primary/backup operators.
4. **Operations owner:** rehearse real staff MFA/OAuth/mail recovery, backup/restore,
   actual hosting/domain/mobile networks and sustained expected traffic including images;
   agree update-latency and provider quota/budget targets.
5. **Release reviewer:** review the full staged and unstaged diff, especially concurrent
   gallery schema/upload/sync additions, freeze the candidate, and complete manual
   assistive-technology checks and final organizer sign-off.

**Readiness decision:** the build, core lifecycle, development authentication and
short concurrency rehearsal have useful positive evidence. Mandatory real Drive
acceptance and operational/security gates remain open, so the website is **not yet
cleared for an official event**. Do not convert the passing local tests into a
production-readiness claim.
