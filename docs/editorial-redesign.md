# Savvy Hunt — The Event Edition

Implemented in the existing Next.js application, using the supplied ZIP as a visual reference only.

## Visual direction

- Warm white pages, cobalt links and actions, a small terracotta masthead punctuation mark, hairline rules and 4px controls.
- Archivo display type and DM Sans body type, self-hosted by Next.js at build time with font swapping and fallback metrics.
- Custom S/H wordmark; large publication-style masthead with an official standings rail.
- Compact data strip populated from current queries. No hardcoded counts, event statuses or publication times.
- Chronological programme rows, with date/time, category, title, venue and organizer-controlled status.
- Explicit tied-rank labels. The home preview includes all schools whose backend rank is at most three, including ties at the cutoff.
- Results use publication sheets with placements and publication details; about uses editable organizer settings and actual categories.
- Gallery retains paginated approved images and adds a native modal lightbox: Escape, previous/next, arrow keys, focus containment and focus restoration.
- Shared form, table, login and admin styling retains the existing controls and permissions.

## Production boundaries

This redesign does not change Convex mutations, score aggregation, role checks, Clerk integration, Drive synchronization, moderation, consent checks, duplicate prevention, audit history or the private image proxy. Frontend data remains subscribed through the existing Convex provider. Existing backend/admin-access changes made concurrently in the workspace are separate from this redesign.

No demo data was inserted. The current connected edition contains existing verification-named events, no published results and no approved gallery photographs; screenshots accurately reflect that state.

## Verification

- `npm.cmd run lint`: ESLint and TypeScript passed.
- `npm.cmd run build`: production build passed. Build-time Google Fonts download requires network access.
- `npm.cmd test`: 58 tests across 11 files passed, including presentation coverage for ties at third place and unpublished completed events. This includes concurrently added admin-access tests.
- `scripts/verify-editorial.mjs`: 32 route/viewport checks passed on the production build, using Edge and axe. Widths: 320, 390, 768 and 1440px. Routes: home, scoreboard, schedule, results, snapshots, about, admin login and anonymous admin access.
- No page runtime errors, horizontal overflow or automated WCAG A/AA violations in these checks. Schedule search and clear-filter controls exercised.
- Authenticated admin editing/publishing and image-filled lightbox interactions were not exercised in this read-only browser pass. No approved photographs were available. Real-world field CLS/LCP and assistive-technology testing remain outside these automated checks.

## Screenshots

Evidence files are local, in `verification-evidence/editorial/` (ignored by Git).

| Page | Before | After |
| --- | --- | --- |
| Home, desktop | [Before](../verification-evidence/editorial/before-home-1440.png) | [After](../verification-evidence/editorial/after-home-1440.png) |
| Home, mobile | [Before](../verification-evidence/editorial/before-home-390.png) | [After](../verification-evidence/editorial/after-home-390.png) |
| Scoreboard, desktop | [Before](../verification-evidence/editorial/before-scoreboard-1440.png) | [After](../verification-evidence/editorial/after-scoreboard-1440.png) |
| Schedule, desktop | [Before](../verification-evidence/editorial/before-schedule-1440.png) | [After](../verification-evidence/editorial/after-schedule-1440.png) |

Machine-readable browser evidence: `verification-evidence/editorial/checks.json`.
