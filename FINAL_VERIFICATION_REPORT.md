# Savvy Hunt — Phase 3 verification

> Historical Phase 3 evidence. `PHASE4_RELEASE_REPORT.md` updates the Drive configuration/access findings, frontend checks, password recovery and capacity rehearsal. Use that report for current release blockers.

**Date:** 28 October 2026
**Verdict:** **Not yet cleared for an official event.** Build, backend integration, real Clerk/Convex authentication, live scoring synchronization, and core browser checks now pass. Approved Google Drive image delivery remains unverified because the development Drive credentials and folder were not supplied. Normal password/MFA sign-in and event-scale capacity also need a rehearsal.

## Environment and scope

- Backend target: **development** `quiet-chickadee-449`, project `savvy-hunt-v2`, region `ap-southeast-2`.
- Browser target: `http://localhost:3000`, using the existing Next.js development server and isolated headless Microsoft Edge contexts.
- Clerk keys were confirmed to be test-instance keys. Credentials stayed in ignored `.env.local` or deployment settings and were not printed in test evidence.
- Generated Convex bindings are present and tracked. Backend code was pushed only with `npx convex dev --once` against the identified development target. No production deployment was changed.
- Verification used clearly labeled development schools, events, users, announcements, and gallery drafts. Historical fixtures and audit records remain in development. Published verification results were revoked; temporary role-test users were deleted and sessions revoked. The verification super-admin identity remains for repeatable development testing.

## Defects found and fixed

1. **Missing Clerk JWT template:** the first real session could not mint a `convex` token (`resource_not_found`). Created the intended template in the Clerk test instance, with audience `convex`.
2. **Wrong issuer configuration:** `CLERK_JWT_ISSUER_DOMAIN` contained the JWKS endpoint. Real tokens failed with `NoAuthProvider`. Corrected the local and development deployment value to the Clerk issuer domain, then pushed auth configuration. Real tokens now authenticate successfully.
3. **Draft overwrite bypass:** an integration test proved a caller could omit `expectedDraftVersion` when overwriting an existing draft. Existing-draft saves now reject missing or stale versions. The formerly failing negative assertion passes.
4. **Stale revoke:** added an expected active revision to revocation so a stale request cannot withdraw a newer correction. Added stale-revoke assertions. An initial return-validator literal-type error stopped the push; corrected the return types and successfully pushed and reran verification.
5. **Historical category changes:** ordinary editing now blocks category changes after published, superseded, or revoked result history exists, not only while an active result pointer exists.
6. **Select accessible names:** category and result-school selects now have explicit accessible names. The original browser event-creation attempt timed out on its category control; the corrected UI creation flow passes.
7. **Accessibility:** automated scans found missing document titles and muted text at 4.45:1 contrast. Added page metadata and darkened muted text. Subsequent WCAG scans pass on the tested pages.
8. **Gallery workflow:** added description editing, earlier/later ordering, native pagination for public/admin galleries, indexed duplicate checking, and unique ordering values. Added paginated admin audit history. These backend/UI controls are verified independently of unavailable Drive credentials.
9. **Credential handling:** `.env.example` contained a real Clerk secret. Removed all example credentials before finalizing the repository index. Removed the unreachable local Git object created during initial staging. Current index and current commit scans find no copies of configured private values; `.env.local` is not tracked.
10. **Schedule validation:** non-finite optional end times are now rejected at the backend boundary, with a regression assertion.

## Exact verification commands and results

| Command / operation | Final result |
|---|---|
| `npx convex codegen` | Passed; regenerated bindings and completed backend TypeScript checking |
| `npx convex env list` | Only `CLERK_JWT_ISSUER_DOMAIN` is configured; Drive/gallery secrets are absent |
| `npx convex env set CLERK_JWT_ISSUER_DOMAIN https://novel-impala-5235.clerk.accounts.dev` | Corrected development issuer configuration |
| `npx convex dev --once` | Passed; development functions ready |
| `npm run lint` | Passed: ESLint and full TypeScript checking |
| `npm test` | Passed: **4 files, 16 tests** |
| `npm run build` | Passed: Next.js compilation, TypeScript, page generation, and optimization |
| `npm audit` | Passed: **0 reported vulnerabilities** |
| `npm ci --dry-run --ignore-scripts --cache .npm-cache` | Passed dependency resolution; upstream ESLint peer-range warnings remain; this was not a full fresh installation |
| `node scripts/verify-development.mjs` | Passed against real Clerk and development Convex, with a real admin browser and two anonymous browser contexts |
| `node scripts/verify-content.mjs` | Passed for announcements, About updates, schedule filtering, and rejection of unverified gallery images |
| `node scripts/verify-browser.mjs` | Passed for **8 public routes × 2 viewports**: no recorded page exceptions, horizontal overflow, or axe WCAG violations |
| `node scripts/check-repository-secrets.mjs` | Passed: 0 configured private-value matches in current Git index and current commit; local environment not tracked |
| `git init`, `git check-ignore ...` | Repository initialized; local environments, dependencies, caches, and evidence artifacts excluded |

The dependency installation reports upstream ESLint plugin peer-range warnings under ESLint 10; the actual ESLint run passes. No audit finding remains. These installation warnings are not evidence that live application behavior failed.

## Scoring and authorization evidence

The `convex-test` suite executes the real exported Convex functions in an isolated in-memory runtime. It covers school uniqueness, invalid input, cross-edition scoring rejection, event status changes without implicit publication, draft isolation, publication, correction deltas, repeat publication, revoke, stale draft/revoke checks, audit records, Common Category, ties, multiple legitimate rows, private-field redaction, and gallery editing/ordering/pagination. Negative authorization assertions cover anonymous, regular authenticated, inactive, and editor identities. These tests supplement the live tests; they do not replace them.

The live development run used actual Clerk users and signed JWTs accepted by Convex. Browser sign-in used a short-lived Clerk sign-in ticket issued by the test instance, not a mocked session. The normal password/MFA/OAuth challenge UI was not exercised.

The live admin browser created two schools and a Category II event through the forms, entered A = 10 and B = 6 in a draft, and reviewed and published it. Before publication, anonymous totals remained zero. After publication, both anonymous contexts saw updated overall standings, category standings, event results, and homepage leaders without refreshing. The UI correction changed A to 8 while keeping B at 6. Revocation returned totals to zero and event detail to “Results pending.” One anonymous context was offline during revoke and recovered to the current state after reconnection.

Two simultaneous live HTTP publication requests produced one `published` and one `already_published` response, with exactly one score contribution. Live stale publication, stale revoke, and omitted draft-version requests were rejected. Real regular, editor, and revoked Clerk identities were also tested against backend access rules.

## Browser and content evidence

The public audit covered home, overall scoreboard, schedule, results, snapshots, About, Category II scoreboard, and an event page at **1440 px** and **390 px**. Authenticated school, event, and gallery screens were additionally scanned at both widths. The final automated scans recorded no WCAG 2 A/AA or 2.1 A/AA violations or horizontal overflow. Automated scans are not a substitute for manual screen-reader testing.

Announcement drafts stayed private; publication and hiding updated an open homepage without refreshing. About content changes propagated to an open page and the original settings were restored. The schedule status filter returned the expected empty state.

Evidence files are local, ignored test artifacts:

- `verification-evidence/development.json`: final live workflow, role, concurrency, and admin accessibility assertions; no recorded admin page exceptions.
- `verification-evidence/content.json`: live content and gallery-rejection assertions.
- `verification-evidence/browser.json`: public route/viewports and axe/overflow results.
- `verification-evidence/scoreboard-desktop.png`, `scoreboard-mobile.png`: inspected scoreboard screenshots.
- `verification-evidence/home-*.png`, `schedule-*.png`, `snapshots-*.png`: public browser screenshots.

## Google Drive status — blocked

There is no configured development Drive folder, service-account email/private key, or gallery proxy secret in the available local/deployment environment. The live action correctly refused approval without consent and without Drive configuration; the draft stayed absent from public gallery queries. The unapproved image endpoint returned **503**, with no image data. No unvalidated image was published.

**Not proven:** successful service-account authorization, approved file accessibility, actual MIME/size/folder/checksum checks against Drive, approved image delivery, moving/trashing a real file, replacement detection, and takedown of an approved image. Pure metadata tests and negative integration checks do not satisfy those release criteria.

To unblock, configure `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, and the same `GALLERY_PROXY_SECRET` in both development Convex and the local server environment. Share the development folder with the service account and supply an approved test image ID through the normal environment/test setup. Do not put credentials into `.env.example`.

## Repository and remaining release work

Git is initialized. Generated bindings and the lockfile are tracked; ignored local credentials are excluded. The current configured-secret scan checks the Git index and current commit, not a general search for every conceivable secret. An initial application commit and an origin remote are present. This verification run did not push to the remote or deploy to production.

Before official-event approval:

1. Complete the real positive and negative Drive scenarios above.
2. Rehearse intended staff password/MFA/OAuth sign-in, recovery, and publisher roles using the organizer's account policy.
3. Confirm official points policy, event content, photo consent procedure, and production configuration. Current verification data is development-only.
4. Run an event-scale capacity/reconnect rehearsal and manual assistive-technology checks. No 500-visitor performance claim is established here.
5. Review and commit the remaining changes, then run the documented production deployment rehearsal with separate credentials. Production deployment still requires explicit authorization.

**Readiness decision:** the core scoring/authentication path now has real development evidence and all local build gates pass. The application remains **not approved for an official event** while required Drive verification and organizer sign-in/operational rehearsal remain outstanding.
