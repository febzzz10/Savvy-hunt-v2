# Savvy Hunt design implementation

Source: `savvy-hunt-design-handoff/design.md` (read in full) and its accompanying mockup.

## Phase 0 — Audit

- Existing working tree contains prior editorial and admin-access changes. Preserve them.
- Next.js 16.4 App Router, React 19, Tailwind 4, DM Sans; no installed icon library.
- Public routes use live Convex subscriptions. Rankings are backend-ranked; equal totals share rank. Published results are separate from event completion.
- ClerkProvider and ConvexProviderWithClerk establish authentication. Admin layout gates access; backend queries and mutations enforce allowlist/role rules.
- Drive gallery uses approved/visible/consented queries and a private Next.js image proxy. Admin uses separate authorized queries, read-only sync, approval, metadata, order, and consent workflows.
- Existing pages have working filters, public event details, category routes, and a native dialog lightbox. These should be extended, not replaced.
- Visual gaps: blue accents, Archivo/all-caps masthead, square surfaces, no collapsed mobile navigation, no podium, thin empty/loading states.
- Baseline: 11 test files / 59 tests pass. Before screenshots stored under `verification-evidence/redesign/before`.

## Implementation sequence

1. Foundation: sage/ivory tokens, Fraunces/DM Sans, responsive navigation, shared states.
2. Public pages: split hero, contextual strip, tailored modules, true-rank leaders, schedule/results/gallery/about.
3. Admin: consistent shell, sign-in, navigation and existing form/table styling.
4. Accessibility/responsiveness: required nine widths, keyboard navigation/dialogs, contrast and overflow.
5. Verification: tests, lint/typecheck, build, live backend browser checks and screenshots.
6. Handoff: record results and remaining integration limitations below.

## Implemented design

- Ivory canvas, white surfaces, pale sage sections, restrained green controls and semantic status colors. Fraunces headings with DM Sans controls and tabular scores.
- Shared responsive header with an accessible disclosure menu, route-aware links, Escape/outside dismissal and a subtle hydration-safe connection indicator. Matching footer and favicon.
- Homepage split masthead, approved-photo slot with an intentional typographic fallback, working contextual links, positive-score leaders, next event, approved-photo preview, published results and conditional announcements.
- Scoreboard category routes retain their subscriptions. Leader highlights preserve backend ranks and include ties; zero-point schools are never crowned. The complete table retains all authoritative rows.
- Schedule retains status/category/date/search filters, IST formatting, event links and reset. Results retain published-only filtering and display actual placements, entry labels, points and publication times.
- Snapshots retains pagination, private image proxy, native modal focus handling, keyboard navigation and captions. No new gallery taxonomy or stock photos.
- About uses configured content, real categories and approved photography when available. No invented organizer or contact details.
- Admin retains every existing page and action, with matching light navigation, mobile menu, verified organizer identity, forms, tables, status messages and Clerk appearance configuration.
- Skeletons, empty states, visible focus, reduced motion, error recovery and a branded 404. The homepage masthead and navigation actions render before live queries resolve; loading content and the Clerk form reserve space to reduce layout shifts.

## Changed implementation files

- Foundation: `app/globals.css`, `app/layout.tsx`, `app/icon.svg`, `app/not-found.tsx`, `components/site-navigation.tsx`, `components/ui.tsx`, `components/editorial.tsx`, `components/data.tsx`.
- Public pages: `app/page.tsx`, `components/home.tsx`, `components/public.tsx`, `app/results/page.tsx`, `app/snapshots/page.tsx`, `app/about/page.tsx`, `components/gallery-photo.tsx`. Existing schedule, scoreboard, category and event-detail routes consume the updated shared components.
- Admin: `app/admin/layout.tsx`, `app/admin/login/page.tsx`, `app/admin/request-access/page.tsx`, `app/admin/setup/page.tsx`. Other admin pages inherit the shared styles without changing mutations or authorization.
- Verification: `tests/editorial.test.tsx`, `tests/home-loading.test.tsx`, `scripts/capture-redesign-baseline.mjs`, `scripts/verify-redesign.mjs`, `scripts/verify-redesign-integrations.mjs`, `scripts/verify-redesign-performance.mjs`, `scripts/inspect-redesign.mjs`. Existing realtime verification selectors were updated for the redesigned homepage.

The repository already contained edits to admin provisioning, Convex schema/admins, documentation, and other files when this task began. Those changes were preserved. This redesign did not change database schemas, backend functions, credentials, middleware, scoring rules, Drive synchronization or proxy authorization.

## Verification evidence — 29 October 2026

| Check | Result |
| --- | --- |
| `npm.cmd test` | 12 files, 62 tests passed; includes initial server-rendered masthead, zero-score and multiway-tie podium cases, existing scoring, lifecycle, security, gallery consent/sync and image-proxy tests |
| `npm.cmd run lint` | ESLint and full TypeScript check passed |
| `npm.cmd run build` | Passed with all public/admin routes and image API; required network-enabled execution for next/font |
| `node scripts/verify-redesign.mjs` | 72 route/viewport checks passed: 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920px; no page exceptions, body overflow or tested WCAG violations |
| `node scripts/verify-redesign-integrations.mjs` | 24 authenticated page checks passed across 12 organizer routes at 390/1440px; real Clerk and Convex sessions; unauthorized state captured |
| Live data comparison | Overall + all six categories matched Convex school names, points, sorting and tied ranks exactly; published result blocks/entries and schedule counts matched backend queries |
| `node scripts/verify-admin-access.mjs` | Anonymous/unlisted protected reads, self-promotion and public bootstrap access denied; temporary unlisted account deleted; no allowlist grants |
| `node scripts/verify-connections.mjs` | Two isolated sessions received published scores and schedule changes without reload; socket disconnect/offline recovery, reused subscription connection and automatic Clerk JWT renewal passed |
| Realtime test cleanup | Temporary development publication revoked and original venue restored; existing audit history retained |
| Console review | Fixed Clerk structural CSS warning using its appearance API, corrected contrast, and added the missing favicon. The expected Clerk development-key notice remains. |
| Final production browser pass | 14 checks across seven public/sign-in routes at 390/1440px passed with no page exceptions, horizontal overflow or tested accessibility violations |
| Layout stability | After reserving loading space, measured CLS was below 0.024 on all 14 runs (previous mobile observations were as high as 0.207) |
| Local homepage LCP | Desktop 0.824s; first cold mobile-viewport navigation 3.748s. The cold mobile run did not meet the aspirational 2.5s target; deployed performance verification remains necessary. |

All live checks target the existing **development** deployment, guarded in `scripts/phase4-support.mjs`. No production deployment was performed.

## Screenshots

Screenshots are stored locally in the gitignored `verification-evidence` directory.

- Before: `verification-evidence/redesign/before/` — home, scoreboard, schedule, results, snapshots, about, sign-in and unauthenticated admin at 390/1440px.
- After: `verification-evidence/redesign/after/` — every primary route at all nine widths; includes filtered schedule and filter-empty results. The real scoreboard includes tied ranks.
- Authenticated: `verification-evidence/redesign/integrations/` — all organizer pages at 390/1440px, unauthorized access, and offline schedule. Existing older baseline admin/gallery evidence is also available in `verification-evidence/phase4-admin-*.png`.
- Production build: `verification-evidence/redesign/production/` — final public/sign-in screenshots and local performance measurements.

### Representative before/after views

| Page | Before | After |
| --- | --- | --- |
| Home desktop | [Before](../verification-evidence/redesign/before/home-1440.png) | [After](../verification-evidence/redesign/production/home-1440.png) |
| Home mobile | [Before](../verification-evidence/redesign/before/home-390.png) | [After](../verification-evidence/redesign/production/home-390.png) |
| Scoreboard | [Before](../verification-evidence/redesign/before/scoreboard-1440.png) | [After](../verification-evidence/redesign/production/scoreboard-1440.png) |
| Schedule | [Before](../verification-evidence/redesign/before/schedule-1440.png) | [Filtered](../verification-evidence/redesign/after/schedule-filtered-1440.png) |
| Results | [Before](../verification-evidence/redesign/before/results-1440.png) | [After](../verification-evidence/redesign/production/results-1440.png) |
| Snapshots | [Before](../verification-evidence/redesign/before/snapshots-1440.png) | [After](../verification-evidence/redesign/production/snapshots-1440.png) |
| About | [Before](../verification-evidence/redesign/before/about-1440.png) | [After](../verification-evidence/redesign/production/about-1440.png) |
| Sign-in | [Before](../verification-evidence/redesign/before/admin-login-1440.png) | [After](../verification-evidence/redesign/production/admin-login-1440.png) |
| Admin dashboard | [Earlier baseline](../verification-evidence/phase4-admin-1440.png) | [After](../verification-evidence/redesign/integrations/admin-1440.png) |
| Gallery management | [Earlier baseline](../verification-evidence/phase4-admin-gallery-1440.png) | [After](../verification-evidence/redesign/integrations/admin-gallery-1440.png) |

[Signed-in unauthorized state](../verification-evidence/redesign/integrations/admin-unauthorized.png) · [Filter-empty results](../verification-evidence/redesign/after/results-filter-empty-1440.png) · [Production metrics](../verification-evidence/redesign/production/metrics.json)

## Limits requiring real event content or deployment verification

- There are no approved live photos in the development gallery. The site correctly renders photo-free states. Successful live Drive byte delivery, populated photo layouts and lightbox interaction cannot be demonstrated against current live content without changing approval/consent data; no consent was invented. Existing gallery/proxy security tests pass.
- Existing gallery-manager records report missing/out-of-folder files. Restoring those source images is separate from this UI redesign.
- Existing verification school/event names remain visible exactly as returned by the development backend; no data cleanup was performed.
- Published results exist, so the screenshots capture published results and filter-empty results. A globally empty results database was not forced by removing official data.
- Local production-mode performance measurements are unthrottled browser observations, not Lighthouse scores, deployed field Core Web Vitals, or mobile-device certification. No production MFA, mailbox recovery, domain or deployment rehearsal was performed.
