# SAVVY HUNT — Website Development Plan

**Document:** `plan.md`  
**Status:** Planning specification, v1.0  
**Prepared:** 28 October 2026  
**Project:** Savvy Hunt — School Event Website & Live Results Platform  
**Reference implementation:** https://github.com/roohiiiit/Savvy-Hunt/tree/main/Savvy-Hunt  
**Proposed stack:** Next.js (App Router) + TypeScript + Convex + Vercel + Google Drive

---

## 0. Decisions and assumptions

### 0.1 Confirmed by the project owner

| Decision | Specification |
|---|---|
| School management | Admin can add participating schools from the admin dashboard; also provide edit/archive operations. |
| Categories | `Category I`, `Category II`, `Category III`, `Category IV`, `Category V`, and `Common Category`. |
| Scoring | **Event-based manual scoring.** Admin enters points for results within each event. |
| Aggregation | System calculates school-wise, category-wise, and overall totals automatically from **published** results. |
| Public pages | Scoreboard; real-time category results; event schedule; upcoming/live events; results/winners; top-three leaders; snapshots. |
| Admin modules | Event management, live event control, scoreboard/result management, gallery updates, school management (confirmed later). |
| Technology | Next.js + TypeScript + Convex + Vercel + Google Drive. |
| Design reference | Existing Savvy Hunt GitHub project, used as a reference rather than blindly copied code. |

### 0.2 Defaults pending confirmation (not treated as final decisions)

| Topic | Working default | Can change later? |
|---|---|---|
| Appearance | Modern responsive redesign inspired by the linked website | Yes |
| Public accounts | None; everyone can browse public pages without signing in | Yes |
| Admin access | Multiple admins with server-enforced roles; start with `super_admin` and `editor` | Yes |
| Live event controls | Admin changes upcoming/live/completed, enters results, and publishes winners | Yes |
| Results publication | Draft → publish, not instant publication when typing | Yes |
| Snapshots | Event photo gallery | Yes |
| Google Drive | Curated Google Drive folder; first release supports adding approved Drive files through admin | Yes |
| Scale target | Test at least 500 simultaneous public visitors; validate against actual usage and plan limits | Yes |
| Date, branding, venue | Not yet supplied — editable from admin configuration | Yes |
| Student or team names | Optional; the scoreboard primarily credits schools | Yes |
| Official scoring policy | Admin-entered points; no automatic predefined 1st/2nd/3rd point values | Yes |

**Not yet decided:** exact event date(s), school branding assets, detailed categories' meaning/age groups, public display of participant names, admin account list, image publication/consent workflow, and whether separate admin roles are necessary. These do not block an MVP architecture.

### 0.3 Main implementation principle

> **Convex is the single source of truth for structured data and scoring.** Google Drive stores gallery originals, not results. A result only affects public leaderboards after an authorized admin explicitly publishes it.

---

## 1. Product goal and success criteria

Create a fast, mobile-friendly website where visitors can follow Savvy Hunt events and results in real time, while authorized organizers manage schools, events, scoring and photos through a secure admin dashboard.

### Goals

1. Visitors discover upcoming/live events, results, winners and photos without creating accounts.
2. Admins create schools and events without editing source code.
3. Admins enter event-specific points manually and preview their effects before publishing.
4. Publishing updates all affected public scoreboard views automatically, without a full-page refresh.
5. Score changes are auditable, reversible via corrected revisions, and never double-counted.
6. Organizer operations remain simple enough to use quickly during a live school event.

### Non-goals for MVP

- Student registration, ticketing, payments or attendance tracking.
- Complex scoring formulas and automatic judging.
- Direct editing of a school's overall cumulative score.
- A full-blown social network, chat or user-generated public photo uploads.
- A mobile native app.
- Automatic recognition of participant faces or people in photos.

---

## 2. Reference-site assessment and migration plan

The supplied repository contains static HTML pages for homepage, scoreboard, schedule, snapshots, about and feedback; an `admin_page` folder contains login, admin dashboard, events, scoreboard, and snapshots pages. Multiple pages reference Supabase; the admin snapshots page opens Google Drive. It is a **functional/design reference**, not the target database architecture.

### Keep / reinterpret

- Core information hierarchy: home, schedule, scoreboard, snapshots.
- Recognition of a live leaderboard and top-three ranking as prominent elements.
- Simple admin operations for events and results.
- Savvy Hunt branding/style motifs where approved by the school.

### Replace / improve

- Replace static HTML routing with Next.js App Router and reusable components.
- Replace Supabase/database code with Convex queries, mutations and reactive subscriptions.
- Replace any browser-side shared-password checks with real authentication and authorization.
- Replace hard-coded school, category, event and score content with editable Convex records.
- Make public status labels and winners come from published backend state rather than local UI placeholders.
- Rebuild gallery as managed, approved media entries rather than relying on a generic Drive-folder redirect alone.
- Improve mobile responsiveness, keyboard accessibility, loading/error states, and performance.

**Migration decision:** Start a new Next.js project and selectively reuse appropriate copy, icons, imagery and styling **only where permission is clear**. Do not migrate HTML scripts or database credentials wholesale.

---

## 3. User roles and capabilities

### 3.1 Public visitor (unauthenticated)

- View homepage and event overview.
- View all participating schools.
- View overall and category-based leaderboards.
- Filter event schedule by category, date and status.
- See upcoming, live and completed events.
- See published results, winners and points.
- See the top-three schools from currently published scores.
- Browse approved gallery items/snapshots.
- Refresh, reconnect or revisit without losing public state.

### 3.2 Admin roles (initial proposal)

| Action | Public | Editor | Super admin |
|---|---:|---:|---:|
| View public content | ✓ | ✓ | ✓ |
| Open admin dashboard | — | ✓ | ✓ |
| Add/edit schools and events | — | ✓ | ✓ |
| Update event status | — | ✓ | ✓ |
| Create/edit draft results | — | ✓ | ✓ |
| Publish or replace official results | — | Optional permission | ✓ |
| Manage gallery entries | — | ✓ | ✓ |
| Invite, revoke, or change admin access | — | — | ✓ |
| Change site-wide settings | — | — | ✓ |
| Review audit history | — | Own/limited | ✓ |

**Implementation:** store explicit capabilities/roles in Convex, check on **every backend mutation**, and never treat a hidden page or disabled button as security. An MVP can initially assign all authorized staff `super_admin` if fewer roles are wanted; the model should still permit separation later.

### 3.3 First-admin bootstrap

- Create the first admin through a controlled, private setup procedure (one-time seed script or secure invitation).
- Never offer an unrestricted public “Become admin” signup path.
- Store secret values only in server/backend environment configuration.
- Support revoking an admin immediately.

---

## 4. Public information architecture

### Routes

| Route | Purpose | Main UI elements |
|---|---|---|
| `/` | Homepage | Hero, current status, top three, live event cards, latest published results, schedule preview, gallery teaser |
| `/scoreboard` | Overall scoreboards | School rankings, totals, category filter, tie handling, last-updated indicator |
| `/scoreboard/[categorySlug]` | Category scoreboard | Ranking within one category, category-related result history |
| `/schedule` | Full schedule | Date/category/status filters, upcoming/live/completed sections |
| `/events/[eventSlug]` | Event detail | Time, venue, category, live state, published results, winners |
| `/results` | Published results hub | Latest published events, winning schools, links to event details |
| `/snapshots` | Photo gallery | Approved photo grid, categories/event filters, accessible image viewer |
| `/about` | Event introduction | Mission, organizers, instructions, contact details (editable content) |
| `/admin/login` | Secure sign-in | Login and recovery UX |
| `/admin` | Admin overview | Counts, live events, draft results, recent updates, shortcuts |
| `/admin/schools` | School manager | Add/edit/archive schools |
| `/admin/events` | Event manager | Create/search/edit events, manage schedule/status |
| `/admin/events/[id]/results` | Results editor | Draft placements, school points, preview, publish/revise |
| `/admin/scoreboard` | Scoreboard control | Verify totals by school/category; investigate contributions |
| `/admin/gallery` | Media manager | Add/select Drive photos, captions, publish/hide |
| `/admin/settings` | Configuration | Edition, contact, branding, time zone, category setup |
| `/admin/audit` | Change history | View result publications and critical changes |

**URLs are proposals**; final event slugs must be unique within an edition. All admin routes need server-side authorization as well as UI guards.

### 4.1 Homepage

1. Hero with Savvy Hunt title, edition/date, location and optional action link.
2. Event phase banner: `Before Event`, `Live Now`, or `Event Concluded`, managed deliberately by admins.
3. **Who's Leading?**: first, second, third **school ranks** based on published overall points.
4. Live-event strip with category and venue.
5. Latest published-results activity: “Results published for …” with time.
6. Upcoming events preview with a link to the full schedule.
7. Snapshot/photo preview and footer.

Show an honest empty state (e.g., “Scores will appear when official results are published”) before the first publication.

### 4.2 Overall scoreboard

- List/table with rank, school name, total points, and per-category breakdown.
- Category picker: `Overall`, `Category I` … `Category V`, `Common Category`.
- Optional search by school name.
- Responsive: full table on desktop; compact ranking cards on small screens.
- Tie badge or equal numeric rank for equal points; use alphabetical order only as a deterministic **display order**, not an invented tie-breaker.
- “Last official update” comes from server publication time.
- Loading, offline/reconnecting, and no-results states.

### 4.3 Category result pages

- Show schools ranked solely on points from events assigned to the selected category.
- Show recent **published** results belonging to that category.
- Show event cards with winner, points and publication time.
- Do not count points from other categories in a filtered view.
- Count `Common Category` in overall totals exactly once; also give it its own dedicated category view.

### 4.4 Schedule

- Views: `Upcoming`, `Live`, `Completed` / `Results & Winners`.
- Filters: category, date, venue (if venues exist), search.
- Event cards show title, category, date, time, location, status and details link.
- Actual `live/completed` status is controlled by an admin, not inferred solely from the clock.
- Times stored as UTC timestamps, presented in `Asia/Kolkata` by default; editable if requirements change.
- Completed events without published results say “Results pending,” rather than showing fabricated winners.

### 4.5 Results & winners

- A result becomes public only when its revision is `published` and active.
- Each event may have multiple winning entries (students or teams from the same school are possible).
- Show rank/placement **only if entered by the admin**; do not infer a placement from points unless the school adopts that rule.
- Display optional participant/team names **only with school approval and appropriate consent**.
- Clearly distinguish `Live event`, `Completed — results pending`, and `Official results published`.

### 4.6 Snapshots

- Grid, lazy-loaded images, alt text, captions, event tags and date.
- Only `published/approved` images visible publicly.
- Admin ability to hide or replace a photo immediately.
- Do not expose unpublished student photographs via publicly indexed gallery URLs.

---

## 5. Admin application — workflows

### 5.1 School manager

**Fields:** name (required), short name, optional logo/media reference, optional school code, edition, display order, active/archived status.

**Features:**
- Add school; validate non-blank name and prevent duplicate school codes/names within an edition.
- Edit name/logo/code without losing past results (stable school ID).
- Archive instead of deleting a school referenced by published results.
- Show school score breakdown and number of participating event entries.
- Confirm destructive actions.

### 5.2 Category management

Seed exactly six category rows for the initial event:

1. Category I
2. Category II
3. Category III
4. Category IV
5. Category V
6. Common Category

Each stores an ID, label, slug, ordering and active state. Categories are fixed for this edition unless super admin changes policy; **existing events must not silently change category** after results are published.

### 5.3 Event creation and management

**Required fields:** title, category, scheduled start, status.  
**Optional fields:** description, end time, venue, host/contact, sequence/order, cover image, instructions, organizer note.

**Event status:**

`upcoming → live → completed` (with optional `cancelled` / `postponed`).

**Result publication state is separate:**

`no_results → draft → published` (subsequent corrections create a **new draft revision**; published results remain visible until replacement is approved).

**Admin operations:**
- Create, edit, duplicate, postpone and archive/cancel an event.
- Mark live; mark completed; edit venue/time safely.
- Open results editor and view latest published revision.
- Highlight live events and publish operational announcements (announcements can be Phase 2).
- Prevent deletion of events that have published score contributions; use archive and controlled correction instead.

### 5.4 Entering and publishing scores — critical path

1. Admin opens a specific event.
2. Admin creates or edits its **draft result revision**.
3. For each award/entry, admin selects **school**, optionally specifies participant/team or entry label, enters rank/placement if known, and enters **manual points** (number).
4. Category is inherited from the event and displayed read-only to avoid mistakes.
5. Admin sees draft totals and a **publication preview**: changes to each school's category and overall total, including effects of correcting old results.
6. Admin confirms publishing (extra confirmation for replacing already published results).
7. Backend atomically switches the active result revision and updates aggregate totals.
8. Public scoreboard, category results, top three and event page update via Convex reactive queries.
9. Audit log records actor, event, revision, change reason and time.

**Never update a public score merely because an admin types into a text field.**

### 5.5 Correcting a published result

- Open current official revision → click “Create correction draft.”
- Copy current rows into a new editable draft; change necessary fields and include a reason.
- Before publishing, compare old vs. new contributions by school.
- Publish replacement **once**; old active contributions are removed and new contributions added in one transaction.
- Keep old revision in history for review; do not erase it to conceal corrections.
- If an entire result must be withdrawn, use a controlled `revoke` operation that removes its active score contributions and records why.

### 5.6 Admin scoreboard inspector

- Read-only inspection of computed school and category totals.
- Drill down to which **published events** contributed points.
- Highlight potential anomalies (negative points if disallowed, duplicate entries, unpublished draft, missing school).
- No direct text box for overwriting a school's cumulative total in MVP.

### 5.7 Admin gallery workflow

**MVP assumption:** organizer stores originals in an approved Google Drive folder and registers selected file IDs/links in admin gallery. Admin adds caption, alt text and event category, previews image, then explicitly publishes.

**Later enhancement:** secure browser-based direct-to-Drive upload and/or periodic Drive-folder sync. Both require approved Google Drive API authentication, quotas, ownership and permission decisions.

---

## 6. Technical architecture

```text
           PUBLIC VISITORS                       EVENT ADMINS
                 |                                    |
                 +---------- HTTPS -------------------+
                                     |
                       Vercel / Next.js App Router
                         |                    |
                   Public React UI        Admin React UI
                         |                    |
                         +---------+----------+
                                   |
                       Convex client subscriptions
                                   |
                Convex Backend (queries / mutations)
                 |         |         |          |
              Schools    Events   Results    Gallery metadata
                                   |
                         Published score totals
                                   |
                           Real-time UI refresh

      Gallery originals: Google Drive (approved folder / API)
      Restricted media integration: server-side adapter (Next.js)
      Authentication: Convex-compatible provider, server checked
```

### Responsibilities

| Technology | Responsibility |
|---|---|
| Next.js | Routes, shared layouts, public/admin UI, SEO metadata, protected server adapter endpoints |
| TypeScript | Shared entity types, validation contracts and safer refactoring |
| Convex | Structured database, realtime queries, transactional score mutations, audit records |
| Vercel | Hosting, preview and production environments, DNS/HTTPS, server route hosting |
| Google Drive | Master copy of approved event/gallery photos and organizer media folder |
| Authentication | Restrict admin identity and roles; integrate with Convex auth verification |

### Authentication decision to make during implementation

**Preferred within the requested stack:** Evaluate Convex Auth with client-side admin experiences, noting that Convex Auth is currently beta and its Next.js SSR/server-route integration has experimental limitations. Public pages can remain unauthenticated; admin data access must be checked inside Convex functions. If requirements demand stable server-side authentication in Next.js routes, consider a supported provider such as Clerk or Auth0 **only after approval**, since that adds another service. Do not create an insecure custom password system to avoid this decision.

Official reference: https://docs.convex.dev/auth/convex-auth and https://docs.convex.dev/client/nextjs/app-router/

### Realtime behavior

- Subscribe public components to narrow Convex queries: current leaderboard, category leaderboard, live events, recent published results.
- Backend mutations update subscriptions automatically. No manual page polling necessary for scores.
- Batch/stateful publication: the public never sees a half-published result.
- Show transient reconnect state when a visitor loses network access.
- Use indexed and pre-aggregated queries for scale; avoid scanning every historical result for every visitor.

Official reference: https://docs.convex.dev/realtime

---

## 7. Convex data model (proposed)

**Naming note:** Use actual Convex `Id<"table">` references rather than arbitrary strings for internal relations. Exact validators and indexes will be written during implementation.

### 7.1 Core tables

#### `editions`

Fields: `name`, `year`, `slug`, `startsAt?`, `endsAt?`, `timezone`, `status` (`planning|live|concluded`), `isCurrent`, `createdAt`.

Purpose: allows a new Savvy Hunt year without overwriting previous results.

#### `schools`

Fields: `editionId`, `name`, `shortName?`, `schoolCode?`, `logoDriveFileId?`, `status` (`active|archived`), `createdBy`, `createdAt`, `updatedAt`.

Indexes: `by_edition`, `by_edition_code`. Validate duplicate names/codes in mutation logic.

#### `categories`

Fields: `editionId`, `name`, `slug`, `sortOrder`, `isActive`.

Indexes: `by_edition`, `by_edition_slug`.

#### `events`

Fields: `editionId`, `categoryId`, `title`, `slug`, `description?`, `startsAt`, `endsAt?`, `venue?`, `status`, `resultStatus`, `activePublishedRevisionId?`, `isFeatured`, `createdBy`, `createdAt`, `updatedAt`.

Indexes: `by_edition_start`, `by_edition_status`, `by_category_start`, `by_edition_slug`.

#### `resultRevisions`

Fields: `eventId`, `revisionNumber`, `status` (`draft|published|superseded|revoked`), `correctionOfRevisionId?`, `changeReason?`, `createdBy`, `createdAt`, `publishedBy?`, `publishedAt?`.

Indexes: `by_event`, `by_event_status`.

#### `resultEntries`

Fields: `revisionId`, `eventId`, `schoolId`, `entryLabel?`, `placement?`, `points`, `displayParticipantName?`, `namePublishingApproved?`, `remarks?`, `sortOrder`.

Indexes: `by_revision`, `by_event_school`.

Rules:
- Multiple entries per school in one event are **allowed** when that school has multiple genuine awards/participants.
- Do not merge separate legitimate entries merely because school IDs match.
- Prevent accidental duplicate saves with stable row IDs and deduplicated mutation requests.
- Points must be valid finite numbers, within an admin-configurable range. MVP default: **non-negative integers only**; any decimals or penalty scoring require explicit approval.
- If placement is entered, validate it (positive integer or an explicitly defined special placement).

#### `schoolCategoryTotals`

Fields: `editionId`, `schoolId`, `categoryId`, `points`, `updatedAt`.

Indexes: `by_edition_category`, `by_edition_school`, plus an index/key strategy guaranteeing only one logical total row per edition/school/category.

**Meaning:** cached authoritative totals maintained by backend publication mutations, *not* editable by normal admin forms.

#### `galleryItems`

Fields: `editionId`, `eventId?`, `driveFileId`, `title?`, `caption?`, `altText`, `sortOrder`, `approvalStatus` (`draft|approved|hidden`), `approvedBy?`, `approvedAt?`, `consentConfirmed`, `addedBy`, `createdAt`.

Indexes: `by_edition_status`, `by_event_status`. Only approved items flow to public gallery queries.

#### `admins`

Fields: `authUserId`, `displayName`, `role`, `isActive`, `createdAt`, `updatedAt`.

Index: `by_auth_user_id`. Admin identity and role must be resolved server-side.

#### `auditLogs`

Fields: `editionId?`, `actorAuthUserId`, `action`, `entityType`, `entityId`, `summary`, `before?`, `after?`, `reason?`, `createdAt`.

Indexes: `by_entity`, `by_actor`, `by_time`. Limit sensitive data captured in logs.

#### `siteSettings`

Fields: `editionId`, `eventTitle`, `tagline?`, `logoFileRef?`, `heroImageRef?`, `contactInfo?`, `publicAnnouncement?`, `updatedAt`.

### 7.2 Optional Phase 2 tables

- `announcements`: live operational alerts with admin publish/unpublish controls.
- `resultApprovalRequests`: maker/checker workflow if a separate approver becomes mandatory.
- `syncJobs`: Drive import status, continuation cursors and error details.
- `pageContent`: editable about/FAQ text if needed.

---

## 8. Scoring contract — precise rules

### 8.1 Fundamental aggregation

Each official **event result entry** has manual points recorded by an admin, and each event belongs to exactly one category.

For school `S`, category `C`:

```text
CategoryTotal(S, C) = SUM(points of all active PUBLISHED result entries
                          whose school = S and whose event category = C)

OverallTotal(S) = SUM(CategoryTotal(S, C) for all six categories)
```

For the edition's ranking:

```text
Sort schools by OverallTotal descending.
Equal points => equal rank. Alphabetical school name can stabilize display order.
Top-three widget => leading three distinct schools, with ties marked honestly.
```

**Common Category** is one of the six categories: counted once within its own table and once when adding the six category totals to overall. It is **not** copied to the five other category leaderboards.

### 8.2 Worked example (illustrative only)

| Event | Category | School | Manual points |
|---|---|---|---:|
| Quiz Final | Category I | School A | 10 |
| Quiz Final | Category I | School B | 7 |
| Debate | Category II | School A | 6 |
| Open Challenge | Common Category | School B | 9 |

Result:

- School A: Category I = 10; Category II = 6; overall = **16**.
- School B: Category I = 7; Common Category = 9; overall = **16**.
- Both have an overall tie; the platform must **not** declare a sole leader on arbitrary alphabetical sorting.

### 8.3 Drafts, publications and revisions

**Invariant 1 — no draft leakage:** draft entries never affect public scoreboard queries or public event winners.

**Invariant 2 — exactly one active published revision per event:** an event may have draft and historical revisions, but only `events.activePublishedRevisionId` contributes official points.

**Invariant 3 — atomic replacement:** replacing an official revision subtracts the previous revision's per-school contributions and adds the new revision's contributions in the **same authorized Convex mutation**.

**Invariant 4 — idempotency:** trying to publish the already-active revision again causes no score change.

**Invariant 5 — stable category:** if an event with published points must change category, a privileged operation migrates its contributions between categories atomically and writes an audit log; ordinary event edit disallows changing it silently.

**Invariant 6 — clear score provenance:** every point in an aggregate total can be explained by a published event entry or correction history.

### 8.4 Publish algorithm (pseudo-code)

```text
publishResults(eventId, draftRevisionId):
  require authenticated admin with publish permission
  validate edition, event, draft revision and result rows
  validate every school belongs to this edition
  validate points, duplicate row IDs and optional placements

  oldRevisionId = event.activePublishedRevisionId
  if oldRevisionId == draftRevisionId:
    return "already published"        // no-op; avoid double counting

  oldContribution = group points by school from oldRevisionId (or empty)
  newContribution = group points by school from draftRevisionId
  schoolIds = union(keys(oldContribution), keys(newContribution))

  for each schoolId in schoolIds:
    delta = newContribution[schoolId] - oldContribution[schoolId]
    schoolCategoryTotals[event.edition, schoolId, event.category] += delta

  mark old revision superseded (when applicable)
  mark new revision published and stamp admin/time
  update event.activePublishedRevisionId = draftRevisionId
  update event.resultStatus = "published"
  write auditLog with delta summary and correction reason
  commit all writes as one Convex mutation
```

A direct `revoke` operation uses the same mechanism with `newContribution = {}` and clears the active revision, with reason and audit.

### 8.5 Materialized totals vs. recalculation

- Use `schoolCategoryTotals` for fast live leaderboard subscriptions.
- Recalculate per-school overall totals by summing their six category rows at query time; six categories is a small, bounded set.
- Implement an internal **reconciliation** function that recomputes totals from active published revisions and compares them with the cached rows. Super admin can inspect mismatches and run a controlled repair.
- Validate at least two admins trying to publish the same event at once; Convex transaction retries/serialization and revision checks must prevent lost or duplicated contributions.
- Record the reason for every published correction.

### 8.6 Ranking rules (proposed)

- Show zero-point active schools in the scoreboard unless school officials request otherwise.
- Equal points receive equal rank; standard competition ranking, e.g., `1, 1, 3` (subject to school preference).
- Do not auto-break ties by medals, number of events, or publication time without an officially approved policy.
- On category pages, ranks use **that category's** points only.
- For top-three display, label tied ranks and choose whether to show every school tied for third after reviewing available space; never mislabel a tie as an outright win.

---

## 9. Convex function and access design

### Public queries (read-only, no login)

- `editions.getCurrent`
- `schools.listActive`
- `categories.listCurrent`
- `events.listPublic({ categoryId?, status?, day? })`
- `events.getPublicBySlug({ slug, editionSlug? })`
- `results.getPublishedByEvent({ eventId })`
- `results.listRecentPublished({ editionId, limit })`
- `scoreboard.getOverall({ editionId })`
- `scoreboard.getCategory({ editionId, categoryId })`
- `scoreboard.getTopThree({ editionId })`
- `gallery.listApproved({ editionId, eventId?, cursor? })`
- `siteSettings.getPublic`

Every public query must **explicitly filter** unpublished drafts, hidden media and private admin notes.

### Admin queries

- `admin.dashboardSummary`
- `admin.listSchools`
- `admin.listEvents`
- `admin.getDraftRevision`
- `admin.getContributionBreakdown`
- `admin.listAuditLogs`

### Admin mutations

- `schools.create / update / archive`
- `events.create / update / setStatus / cancel`
- `results.createDraft / upsertDraftEntry / deleteDraftEntry / publishRevision / revokePublished`
- `gallery.addDriveFile / updateMetadata / publish / hide / reorder`
- `admins.invite / updateRole / revoke` (super admin only)
- `siteSettings.update` (super admin only)

### Security guarantees

- Every mutation resolves the logged-in identity via the supported auth integration.
- Every mutation checks that the user's admin record is active and has the necessary permission.
- Do not trust role IDs, school IDs or event IDs supplied by the browser without backend authorization and edition validation.
- Validate all inputs both in the UI and in server-side Convex validators/business rules.
- Use paginated queries where data could grow (gallery, history, audit logs).
- Rate-limit or otherwise harden any public-facing unauthenticated write endpoint (if added later).
- Protect Google API credentials and file permissions; do not store secrets in frontend code.

---

## 10. Google Drive integration — practical design

### 10.1 Rules of ownership and privacy

- Use a school/organizer-owned Google Drive folder, not a departing student's personal Drive.
- Organizer controls upload access; public sees **only explicitly approved** photographs.
- Obtain required school permissions and consent before public posting images of students.
- Do not expose the Drive service account key, OAuth refresh token or unrestricted folder listing to the browser.
- Store Drive IDs and gallery captions/status in Convex; do not put full photos in Convex DB documents.

### 10.2 MVP: curated media from Drive

1. Organizer uploads photos into a designated Drive folder.
2. Gallery admin selects approved image files and adds their Drive file IDs/links in the admin page.
3. Backend validates the file metadata/type and that it belongs to an allowed location or approved list.
4. Admin adds caption, alt text, event association and confirms permission to publish.
5. Website shows only approved gallery records.
6. If a photo is removed from Drive or access is revoked, website shows a fallback rather than a broken page.

**Important:** Do not rely on ad-hoc `drive.google.com/file/...` links as guaranteed high-volume image CDN endpoints. Drive API file bytes may require authentication and generated thumbnail URLs can expire. If direct rendering proves unreliable, use a controlled image delivery route with caching (and check Vercel limits) or get approval for a dedicated public image CDN. Google Drive remains the archive of originals.

### 10.3 Future: browser upload to Drive

- Admin selects JPEG/PNG/WebP, checks preview and size limit.
- Authorized Next.js server route/adapter authenticates the admin and requests a short-lived, scoped Google API upload operation.
- Create Drive file in the approved folder only; write its Drive ID and metadata to Convex.
- Include progress, retry behavior, duplicate handling, and post-upload moderation.
- Use Google OAuth or organization-approved service identity, depending on Drive ownership and organization policy. Do **not** assume that a service account automatically has access to a personal Drive folder.

Official references:  
https://developers.google.com/workspace/drive/api/guides/about-files  
https://developers.google.com/workspace/drive/api/guides/manage-uploads  
https://developers.google.com/workspace/drive/api/guides/manage-downloads

---

## 11. User interface and visual design specification

### Design direction (working default)

- Modern and energetic school-event aesthetic informed by the reference site's hierarchy.
- Responsive first; primary score and live-state information visible without excessive scrolling.
- High-contrast score badges, category chips and well-spaced tables/cards.
- Use a consistent design token system for colors, typography, spacing, shadows and breakpoints.
- Do not choose final school colors until branding assets are confirmed.
- Prefer CSS and small SVG decorations to heavy animation; support reduced-motion preferences.

### Shared component library

`AppHeader`, `MobileNav`, `Footer`, `EventStatusBadge`, `CategoryFilter`, `SchoolBadge`, `LeaderboardTable`, `PodiumTopThree`, `LiveEventCard`, `ScheduleTimeline`, `ResultEntryCard`, `SnapshotGrid`, `EmptyState`, `ConnectionStatus`, `AdminSidebar`, `FormField`, `ConfirmationDialog`, `AuditHistoryPanel`.

### Accessibility and usability

- Keyboard-friendly filters, forms and dialog focus management.
- Semantic headings, accessible labels and alt text.
- Color plus text/icons to distinguish live/pending/published states.
- Contrast checks and usable touch targets.
- Clear field-level validation and saving/publishing confirmations.
- Prevent accidental double-submissions during slow network conditions.

---

## 12. Proposed repository structure

```text
savvy-hunt/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── scoreboard/
│   │   ├── page.tsx
│   │   └── [categorySlug]/page.tsx
│   ├── schedule/page.tsx
│   ├── events/[eventSlug]/page.tsx
│   ├── results/page.tsx
│   ├── snapshots/page.tsx
│   ├── about/page.tsx
│   ├── admin/
│   │   ├── login/page.tsx
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   ├── schools/page.tsx
│   │   ├── events/page.tsx
│   │   ├── events/[id]/results/page.tsx
│   │   ├── scoreboard/page.tsx
│   │   ├── gallery/page.tsx
│   │   ├── settings/page.tsx
│   │   └── audit/page.tsx
│   └── api/
│       └── media/route.ts      # Optional authenticated Drive adapter
├── components/
│   ├── public/
│   ├── admin/
│   └── ui/
├── convex/
│   ├── schema.ts
│   ├── auth.config.ts          # Exact auth setup depends on provider
│   ├── editions.ts
│   ├── schools.ts
│   ├── categories.ts
│   ├── events.ts
│   ├── results.ts
│   ├── scoreboard.ts
│   ├── gallery.ts
│   ├── admins.ts
│   ├── audit.ts
│   └── lib/
│       ├── permissions.ts
│       ├── scoring.ts
│       └── validation.ts
├── hooks/
├── lib/
│   ├── constants.ts
│   ├── formatting.ts
│   ├── drive.ts                 # Server-only media helpers
│   └── timezone.ts
├── public/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/
│   └── seed-edition.ts
├── .env.example
├── README.md
├── plan.md
└── package.json
```

This is a **target organization**, not a demand to create every file immediately. Prefer small, feature-complete increments.

---

## 13. Development roadmap (dependency order)

### Phase 0 — Scope, reference review and project setup

- [ ] Confirm school ownership, license/permissions for reference assets, website domain and event coordinator.
- [ ] Freeze the six categories and publish the manual-scoring policy.
- [ ] Decide official tie rules and whether individual winners' names may be published.
- [ ] Collect Savvy Hunt logo, colors, dates, venue and contact information.
- [ ] Create new repository/branch and document local developer setup.
- [ ] Define acceptance testing owner among event organizers.

**Deliverable:** approved scope and brand assets, with unanswered items documented.

### Phase 1 — Frontend foundation and backend connection

- [ ] Initialize Next.js App Router project using TypeScript.
- [ ] Configure lint, formatting and type checking.
- [ ] Initialize Convex development environment and schema.
- [ ] Add application providers for Convex reactive queries.
- [ ] Define responsive layout and shared UI component primitives.
- [ ] Create six default categories and one example edition using safe seed data.
- [ ] Configure local `.env.local`, `.env.example`, dev/test/prod separation.
- [ ] Create simple public and admin route shells.

**Deliverable:** runnable application with working Convex connection and navigation.

### Phase 2 — Admin auth, schools and events

- [ ] Choose and configure supported auth integration.
- [ ] Restrict all admin mutations by backend roles/capabilities.
- [ ] Implement first-admin bootstrap/revocation.
- [ ] Build schools CRUD with safe archiving and duplicate prevention.
- [ ] Build events CRUD with category/date/venue and manual live-state control.
- [ ] Build admin overview with live-event and pending-result counts.
- [ ] Build public schedule and event detail pages from actual Convex data.

**Deliverable:** admins can populate the official school roster and schedule.

### Phase 3 — Results engine and real-time leaderboard (highest priority)

- [ ] Implement result revision and result entry schema.
- [ ] Build result draft editor per event.
- [ ] Validate all school/event/category references and manual point inputs.
- [ ] Implement preview of school/category/overall score changes.
- [ ] Implement atomic publication and correction algorithm.
- [ ] Implement persisted `schoolCategoryTotals` and reconciliation utility.
- [ ] Add school-wise, category-wise and overall Convex queries.
- [ ] Build leaderboard, top three and category-results UI.
- [ ] Build results/winners page with draft/public separation.
- [ ] Add audit logging, permission checks and repeat-publish protection.
- [ ] Verify updates from two browsers without manual refresh.

**Deliverable:** a complete official results workflow with real-time scoreboard.

### Phase 4 — Gallery and content management

- [ ] Select owner-managed Drive folder and access model.
- [ ] Build admin workflow to register and approve photos from Drive.
- [ ] Implement restricted file ID validation and media-delivery fallback.
- [ ] Build public responsive photo gallery, captions and accessible viewer.
- [ ] Add edit/hide controls and permission/consent reminders.
- [ ] Add simple editable homepage text/branding if necessary.

**Deliverable:** approved school event photos appear in snapshots.

### Phase 5 — Stabilization and rehearsal

- [ ] Polish mobile/tablet/desktop layouts and loading/error states.
- [ ] Test every scoring invariant, including corrections and ties.
- [ ] Simulate multiple admins operating during the same live event.
- [ ] Stress-test public leaderboard updates for anticipated audience size.
- [ ] Test Drive image access on mobile networks and under moderate traffic.
- [ ] Check accessibility and image optimization.
- [ ] Validate SEO/social sharing metadata for public pages.
- [ ] Check privacy, Drive approval, auth and environment-secret handling.
- [ ] Run a full mock event from creation through published results.

**Deliverable:** release candidate signed off by organizers.

### Phase 6 — Production deployment and event operations

- [ ] Configure production Convex deployment separate from testing.
- [ ] Connect repository to Vercel and create production environment variables.
- [ ] Configure domain, HTTPS and canonical site URLs.
- [ ] Verify production auth redirect and Google API configuration.
- [ ] Publish official schools/categories/schedule and remove dummy results.
- [ ] Test publication with a private rehearsal and revert rehearsal data.
- [ ] Appoint a results publisher, back-up admin and gallery moderator.
- [ ] Document live-day runbook, rollback procedure and escalation contacts.

**Deliverable:** public launch-ready Savvy Hunt site.

### Phase 7 — Optional enhancements (after MVP)

- [ ] More granular admin roles and maker-checker result approval.
- [ ] Direct photo upload to Google Drive from dashboard.
- [ ] Scheduled Drive folder sync, if approved.
- [ ] Live announcements and push-style activity feed.
- [ ] Printable/exportable result sheets (CSV/PDF).
- [ ] Multi-edition historical archive and year selector.
- [ ] School logos, event cover graphics and sponsorship panels.
- [ ] Analytics, monitoring and structured organizer reports.

---

## 14. Test strategy and mandatory edge cases

### Unit tests: scoring

- [ ] One event, one school, one valid result.
- [ ] Different categories combine correctly in overall total.
- [ ] `Common Category` appears once in overall, not in unrelated categories.
- [ ] Same school earns multiple valid entries in one event.
- [ ] Equal totals result in equal ranks.
- [ ] No scores published yet: all schools have zero (or clearly empty) totals.
- [ ] Draft edits do not affect any public total.
- [ ] Publishing the same revision twice adds points only once.
- [ ] Replacing a published revision subtracts old and adds new, including a change of school.
- [ ] Revoking a result removes only that event's contributions.
- [ ] Archive school does not silently erase historical results.
- [ ] Invalid points (`NaN`, infinity, negative if disallowed, huge values, wrong type) are rejected.
- [ ] Double-click and concurrent admin publish requests do not double-count.
- [ ] Reconciliation totals match materialized totals.

### Integration tests: access and workflows

- [ ] Visitor can read published results but cannot call admin mutations.
- [ ] Inactive admin cannot create, publish or update records.
- [ ] Editor without publish permission cannot publish.
- [ ] School and event reference mismatches across editions are rejected.
- [ ] Draft results never appear in published event or leaderboard queries.
- [ ] Cancelled events are clearly marked and don't invent winners.
- [ ] Revision history records who published and when.

### End-to-end tests: experience

- [ ] Admin creates school → event → draft → publish → two public browsers update.
- [ ] Admin corrects result → public points decrease/increase exactly once.
- [ ] Switch category filters and check correct rankings.
- [ ] Small-screen scoreboard remains readable.
- [ ] Drive gallery item appears only after explicit approval.
- [ ] Image disappears gracefully if Drive file is unavailable.
- [ ] Loss and restoration of connection does not display misleading “Live” success states.
- [ ] Browser refresh retains official published state.

### Load/operations tests

- [ ] Simulate 500 public viewers as an initial target, tuned to actual demand.
- [ ] Measure time from admin publish confirmation to public UI updates under network variability.
- [ ] Verify query bandwidth and provider quotas/costs before event day.
- [ ] Run a dress rehearsal on the actual production deployment without contaminating official results.

---

## 15. Security, privacy, reliability and operations

### Authentication and authorization

- Use supported authentication instead of frontend-stored passwords.
- Enforce least privilege in Convex mutations/actions and server media routes.
- Keep admin sessions reasonably short on shared school computers; support sign-out.
- Validate all identifiers, text input length, image types and file sizes.
- Add audit logs for published results, revocations, school changes and admin access changes.

### Student privacy

- A school-wide leaderboard can operate without collecting children's personal details.
- Minimize personal data; avoid collecting phone numbers, birthdays or private student profiles.
- Display student/team names only when authorized by the organizer and proper consent/policy.
- Keep unapproved gallery images inaccessible on public pages and remove promptly on request.
- Have the school approve contact details and photography publication policy.

### Reliability and recovery

- Separate Convex dev/test and production deployments.
- Take a pre-event data snapshot/export if supported and appropriate to current tooling; verify recovery by a rehearsal.
- Keep score revision history to undo a mistaken publication safely.
- Prevent accidental deletion of entities that published scores reference.
- Define “results pending” and offline behavior; never replace missing data with invented values.
- Create a written fallback: organizer keeps the approved official tally separately if internet access fails.

### Environment variables (illustrative, actual auth/Drive names depend on selected integration)

```dotenv
# Client-safe, only public Convex endpoint is exposed
NEXT_PUBLIC_CONVEX_URL=

# Deployment environment settings managed through Convex/Vercel
# These illustrative names must NOT be prefixed NEXT_PUBLIC_
GOOGLE_DRIVE_FOLDER_ID=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REFRESH_TOKEN=

# Provider-specific login keys to be added after auth decision
# Keep .env.local out of version control.
```

**Google OAuth and Drive variables are optional for the initial manual-link flow.** Choose least-privilege scopes; never commit credentials or use the browser to call privileged Google Drive APIs with backend secrets.

---

## 16. Vercel deployment checklist

1. Create/confirm GitHub repository owned or managed by the school.
2. Connect GitHub project to Vercel.
3. Choose production branch and verify Next.js build settings.
4. Set `NEXT_PUBLIC_CONVEX_URL` to **production** Convex endpoint, not local/dev.
5. Set backend auth secrets in the supported hosting/Convex environment as applicable.
6. Add Drive server-side credentials **only** to the server environment actually executing media actions.
7. Use preview deployments for pull requests and staging checks.
8. Confirm school domain and HTTPS/canonical redirects.
9. Check no production credentials appear in client bundle, source repository or browser logs.
10. Confirm live scoreboard subscriptions and gallery access from mobile networks.
11. Record responsible admin contacts and the exact rollback path before launch.

Official references: https://docs.convex.dev/quickstart/nextjs and https://vercel.com/docs/deployments/environments

---

## 17. Live-event operator runbook

### Before the event

- Verify category and school rosters with coordinators.
- Assign at least one primary and one backup result publisher.
- Publish event schedule and confirm venue/time.
- Log in on organizer device and test permissions.
- Check public page from a separate anonymous browser.
- Confirm network/mobile fallback and official offline score records.

### When an event begins

- Mark event `live` in admin.
- Verify it appears in Upcoming/Live navigation.
- Enter draft results as they become official, without prematurely publishing.

### When judges confirm results

- Open draft, cross-check school, event, category, placement and points.
- Preview total changes; ask for second-person verification for high-impact results.
- Publish and check public event page, relevant category and overall scoreboard.
- For a mistake, publish a corrected revision with reason; do not overwrite aggregate totals.

### After the event

- Mark event `completed`.
- Verify winners/result state and reconciliation check.
- Approve gallery photos only after media review.
- At final event conclusion, set edition status and archive official results.

---

## 18. Definition of done (MVP acceptance criteria)

A release is **MVP complete** only when all of these can be demonstrated:

1. An authorized admin can create/edit/archive schools without code changes.
2. An authorized admin can create/manage category-assigned events.
3. All six categories are represented accurately and editable as configuration only by permitted roles.
4. Manual per-event points can be entered in drafts; no draft affects the public scoreboard.
5. One publication updates school/category/overall totals **exactly once**.
6. Correcting a published result adjusts totals accurately and creates audit history.
7. Public overall and category scoreboards, top three, event schedule, and published winners all match the backend.
8. Two public browsers receive changes reactively without manual refresh.
9. An unauthorized visitor cannot mutate school, event, score or gallery data.
10. Admins can approve/hide gallery photos sourced from the authorized Drive workflow.
11. Pages work on mobile, tablet and desktop with clear pending/error/empty states.
12. Production Vercel and Convex environments are separated from staging and have been rehearsed.

---

## 19. Pending organizer decisions before production

These are **not blockers to starting implementation**; the project will use the assumptions in §0.2 until confirmed.

| Item | Current assumption | What the organizer needs to decide |
|---|---|---|
| Design fidelity | Modern redesign inspired by GitHub | Strict visual copy vs modern redesign vs new look |
| Admin access | Two roles, multiple admins | Actual accounts, publish permissions, second-person approval |
| Event live feed | Status + results; announcements later | Whether live text updates/announcements are needed |
| Results visibility | Only explicitly published results public | Whether admins want immediate publishing option |
| Gallery workflow | Curated Google Drive files linked through admin | Direct browser upload vs Drive folder import vs manual links |
| Snapshots | Approved event photography | Photos only or score-progress snapshots too |
| Event scale/date | Capacity test starts at 500 viewers | Actual dates, expected simultaneous viewers and budget |
| Point rules | Non-negative integer points | Zero/negative/decimal points, result ties, disqualifications |
| Placement and people | Optional participant/team labels | Whether to show names, ranks, school-only winners |
| School/category configuration | Six fixed categories per edition | Whether categories mean distinct grades or age groups |
| Hosting ownership | School-managed accounts | Who owns Vercel, Convex, Drive, domain and credentials |

---

## 20. Immediate implementation order

**Do not build every page as unrelated static screens.** Implement the vertical slice below first:

1. Next.js TypeScript app + Convex configuration.
2. First-admin authentication and server-side access check.
3. Seed edition and six categories; create school and event from admin.
4. Enter **draft manual points** for an event.
5. Publish results using atomic revision replacement + aggregate totals.
6. Show live category and overall leaderboard on a public page.
7. Prove that corrections update all views exactly once.
8. Expand into schedule, event details, top three, full admin UX and Drive snapshots.

This order minimizes the biggest project risk: **getting live scoring and corrections right**. Visual refinement should follow a reliable end-to-end results workflow.

---

## 21. Technical references

- Reference project: https://github.com/roohiiiit/Savvy-Hunt/tree/main/Savvy-Hunt
- Convex + Next.js: https://docs.convex.dev/quickstart/nextjs
- Convex reactive queries: https://docs.convex.dev/realtime
- Convex authentication overview: https://docs.convex.dev/auth/overview
- Convex Auth beta caveats: https://docs.convex.dev/auth/convex-auth
- Convex Next.js App Router: https://docs.convex.dev/client/nextjs/app-router/
- Google Drive API file management: https://developers.google.com/workspace/drive/api/guides/about-files
- Google Drive uploads: https://developers.google.com/workspace/drive/api/guides/manage-uploads
- Google Drive downloads: https://developers.google.com/workspace/drive/api/guides/manage-downloads
- Vercel deployment environments: https://vercel.com/docs/deployments/environments

**End of plan — version 1.0.**
