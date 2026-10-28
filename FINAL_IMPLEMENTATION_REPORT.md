# Savvy Hunt implementation report

**Date:** 28 October 2026  
**Verdict:** **Not production ready.** The application source has been substantially completed, but no Convex deployment, Clerk application, or approved Drive service account is configured here. Full backend type checking, browser flows, and live synchronization are therefore unverified. Do not run an official event or deploy to production yet.

## Completed in source

- Upgraded Next.js, Clerk, and Vitest to compatible current versions; added a lockfile and ESLint configuration. `npm audit` now reports zero known findings.
- Added Clerk proxy setup for Next.js 16, a provider-scoped Convex admin allowlist, super-admin bootstrap, role management, and backend checks on administrative operations.
- Added six-category edition initialization, school create/edit/archive with uniqueness checks, event create/edit/status/participation assignment, announcements, and editable public About content.
- Implemented manual score drafts, private draft editing, before/after/delta preview, optimistic draft version checks, atomic revision publication, idempotent repeat publication, correction reason enforcement, revoke, and audit writes in Convex source.
- Added reactive public home, school and category scoreboards, event schedule and filters, event detail, results filters, announcements, and gallery previews. Archived schools retain their displayed names in historical published results.
- Added gallery metadata drafts, explicit consent confirmation, trusted Drive verification before approval, a restricted server image lookup, content checksum checks, hide/takedown behavior, and broken-image fallback.
- Added pure scoring, admin authorization, and Drive metadata tests. Documented setup, rollback, and event-day rehearsal steps.

## Main files changed or added

| Area | Files |
|---|---|
| Dependencies and tooling | `package.json`, `package-lock.json`, `eslint.config.mjs`, `tsconfig.frontend.json`, `proxy.ts`, `.gitignore`, `.env.example` |
| Convex model and backend | `convex/schema.ts`, `auth.config.ts`, `admins.ts`, `announcements.ts`, `categories.ts`, `editions.ts`, `events.ts`, `gallery.ts`, `results.ts`, `schools.ts`, `scoreboard.ts`, `siteSettings.ts`, `lib/security.ts`, `lib/scoring.ts` |
| Public site | `app/page.tsx`, `about/page.tsx`, `results/page.tsx`, `schedule/page.tsx`, `scoreboard/`, `events/`, `snapshots/`, `components/home.tsx`, `components/public.tsx`, `components/gallery-photo.tsx` |
| Admin site | `app/admin/` school, event, result, scoreboard, gallery, announcement, settings, audit, admin access, setup, and login routes |
| Media and tests | `app/api/gallery/[itemId]/image/route.ts`, `lib/drive-validation.ts`, `tests/scoring.test.ts`, `tests/security.test.ts`, `tests/drive-validation.test.ts` |
| Documentation | `README.md`, `IMPLEMENTATION_NOTES.md`, `database.md`, this report |

## Verification performed

| Command | Result |
|---|---|
| `npm install` and dependency upgrade | Passed; package lock updated |
| `npx eslint .` | Passed with no errors or warnings |
| `npm run lint:frontend` | Passed |
| `npm test` | Passed: 3 files, 8 tests |
| `npm audit` | Passed: 0 vulnerabilities reported |
| `npm run lint` | **Failed**: Convex generated bindings are absent. The many follow-on implicit-type errors are not independently assessed yet. |
| `npm run build` | **Failed** at backend TypeScript checking for the same missing Convex bindings; Next.js compilation completed before type checking. |
| `npx convex codegen` | **Blocked**: `CONVEX_DEPLOYMENT` is not configured. `npx convex dev --configure new --dev-deployment local --once` could not prompt for the required Convex account login in this non-interactive environment. |

These tests establish only pure logic and frontend type soundness. They do **not** establish that Convex mutations, Clerk sign-in, Google Drive access, or real-time updates work against live services.

## Security and data-integrity findings

- Backend functions require a verified Convex identity plus an active admin record; editors cannot publish or revoke. First-admin bootstrap requires both an authenticated identity and a one-time deployment secret, and is rejected once an admin exists.
- Published scores use the event's active revision pointer. Publication checks expected official revision and draft version, computes per-school deltas, and writes totals, pointer, revision state, and audit record in one Convex mutation. This still needs deployed integration tests.
- Public result queries omit draft rows and private remarks. Public school and event queries return projected fields. Approved Drive file IDs require a server-only proxy secret to retrieve.
- Gallery approval checks accessible folder membership, MIME type, and size. Delivery rechecks these constraints and disables caching. Service-account access and takedown still need real testing.
- Production permission, privacy, race, load, and account-revocation behavior have **not** been verified. No production data or credentials were used.

## Remaining bugs and limitations

1. **Release blocker:** Generate `convex/_generated/` from a configured Convex development deployment, then resolve any actual backend TypeScript errors and obtain passing `npm run lint` and `npm run build` results.
2. **Release blocker:** Run Convex integration tests for school/event creation, draft isolation, publish, correction, repeat publication, revoke, archived-school history, cross-edition rejection, stale draft/revision races, and role enforcement. Current tests are pure unit tests only.
3. **Release blocker:** Run Clerk sign-in and role tests in a real development environment. Test editors, super admins, revoked admins, and anonymous users.
4. **Release blocker:** Test Drive approval and image delivery with the organizer's service account, including inaccessible, moved, trashed, oversized, unsupported, and hidden images.
5. **Release blocker:** Demonstrate an admin publication updating two anonymous browsers without refresh, then verify correction and revoke propagation.
6. Browser responsive, accessibility, reconnection, load, and Vercel deployment tests are outstanding. No production deployment was attempted.
7. Admin audit and gallery lists have fixed limits or unbounded small-edition queries; add pagination and load checks when actual event scale is known.
8. The organizer must confirm the working point policy, photo consent procedure, official dates/venues, branding, admin roster, and production domain before launch.

## Required external configuration

The organizer needs to create or grant access to a **development** Convex project, a **development** Clerk app with a `convex` JWT template, and an approved Google Drive folder shared with a read-only service account. Configure the variables in `.env.example` in the locations described by `README.md`. Provide access through environment configuration; do not send private keys in chat or commit them. Separate production projects and keys are required after development verification.

## Deployment and rollback

Follow `README.md` for development setup, production deployment order, first-admin setup, rollback, and the event-day testing checklist. Deployment remains withheld pending the release blockers above and explicit production authorization.
