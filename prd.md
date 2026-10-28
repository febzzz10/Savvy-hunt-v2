# Savvy Hunt — Product Requirements Document (PRD)

**File:** `prd.md`  
**Status:** Implementation-ready MVP scope, with explicitly marked working defaults  
**Updated:** 28 October 2026  
**Related:** [`plan.md`](./plan.md) · [`architectur.md`](./architectur.md) · [`database.md`](./database.md) · [`techspc.md`](./techspc.md) · [`appflow.md`](./appflow.md)

> **Coding-agent summary:** Build a public school-event website and a secure organizer dashboard. Schools are created by admins. Each event belongs to one of six categories. Admins **manually enter points per event**; publishing an official result **automatically updates live school-wise, category-wise and overall leaderboards**. Google Drive holds gallery originals; Convex is the source of truth for scores.

## 1. Decision ledger — read before coding

### CONFIRMED by project owner

| ID | Requirement |
|---|---|
| C-01 | Stack: **Next.js + TypeScript + Convex + Vercel + Google Drive**. |
| C-02 | Reference: https://github.com/roohiiiit/Savvy-Hunt/tree/main/Savvy-Hunt. |
| C-03 | Admin can create participating **schools** from the admin panel. |
| C-04 | Six categories: **Category I, Category II, Category III, Category IV, Category V, Common Category**. |
| C-05 | **Event-based manual scoring**: admin chooses the event and enters points for school results. |
| C-06 | **Automatic aggregation**: school-wise and category-wise totals derive from official event results. |
| C-07 | Public: scoreboard, real-time category results, event schedule, upcoming/live events, winners/results, top-three leaders, snapshots. |
| C-08 | Admin: create/manage events, live event status, scoreboard/results, gallery updates. |

### WORKING DEFAULTS — reversible, not school-approved decisions

| ID | Default | Why |
|---|---|---|
| D-01 | Public browsing requires no account. | Low friction for spectators. |
| D-02 | Two admin roles: `editor` and `super_admin`; only super admin publishes/revokes official results. | Prevent accidental publication. |
| D-03 | Score entry starts as a draft; public scores update **only on publish**. | Reliability and review. |
| D-04 | Points are **nonnegative integers**; no auto-assigned medal points. | Scoring policy not yet supplied. |
| D-05 | An event has exactly one category. | Unambiguous aggregation. |
| D-06 | “Snapshots” means an approved photo gallery, curated from Google Drive. | Matches reference project. |
| D-07 | Modern mobile-first redesign inspired by existing repo. | Reference is inspiration, not technical dependency. |
| D-08 | Dates, venue, name/branding, school list and official participants are editable, not hard-coded. | Facts still pending. |
| D-09 | Every published revision retains an audit trail; corrections require a reason. | Avoid inconsistent tallies. |
| D-10 | Equal points have equal ranking; no hidden tie-breaker. | Fair presentation. |

**Important:** Treat defaults as working assumptions, not confirmed policy. Escalate decisions involving student names/photos, tie awards, penalties/decimal points, admin identity provider or costs **before production**.

## 2. Product purpose

**Problem:** Spectators need one trustworthy view of event progress and school standings. Organizers need to maintain events, manually enter official points, and publish accurate results quickly without code edits or spreadsheet copy/paste.

**Desired outcome:** When an authorized admin publishes a validated event result, every connected visitor sees the updated leaderboard and winners automatically, without refreshing.

### Personas

| Persona | Goal | Access |
|---|---|---|
| Visitor/student/parent | View schedule, current leaders, results and gallery. | Public, read-only. |
| Event editor | Add schools/events, change event status, draft points, curate images. | Authenticated & allowlisted. |
| Super admin | Verify and publish/correct scores, manage permissions and settings. | Elevated authenticated access. |

## 3. MVP scope and features

### Public pages

| ID | Route | Required user-facing behavior | Priority |
|---|---|---|---|
| PR-01 | `/` | Savvy Hunt hero, live/upcoming events, top three schools, recent published results, gallery preview. | P0 |
| PR-02 | `/scoreboard` | All active participating schools ranked by **overall official points**; category filters and zero-score states. | P0 |
| PR-03 | `/scoreboard/[categorySlug]` | Category-specific leaderboard; show only points earned from that category's events. | P0 |
| PR-04 | `/schedule` | Sort/filter scheduled events by category, day, and status. Display times using event timezone. | P0 |
| PR-05 | `/events/[eventSlug]` | Event details, current status, and official winners/points when published; otherwise “Results pending.” | P0 |
| PR-06 | `/results` | Recent **published** event results, searchable/filterable as needed. | P1 |
| PR-07 | `/snapshots` | Approved media only, captions and accessible alt text. | P1 |
| PR-08 | `/about` | School-approved event description and organizers. | P2 |

### Admin pages

| ID | Route | Required capability | Priority |
|---|---|---|---|
| AD-01 | `/admin/login` | Supported identity-provider sign-in; reject non-allowlisted accounts. | P0 |
| AD-02 | `/admin` | Overview of live events, pending drafts and recent publications. | P0 |
| AD-03 | `/admin/schools` | Create, list, edit and archive schools. | P0 |
| AD-04 | `/admin/events` | Create/edit events; select category, time and venue; control upcoming/live/completed status. | P0 |
| AD-05 | `/admin/events/[id]/results` | Draft result rows; assign school, optional placement/label and **manual points**; preview/publish/correct. | P0 |
| AD-06 | `/admin/scoreboard` | Inspect official totals and see which published events contributed points. | P0 |
| AD-07 | `/admin/gallery` | Register Drive files, add descriptions, approve/hide photos. | P1 |
| AD-08 | `/admin/settings` | Configure edition, branding, public announcement and location/date fields. | P1 |
| AD-09 | `/admin/audit` | Super-admin view of changes and result publication history. | P1 |

### Out of scope for MVP

- Online student registration, ticketing, payments or attendance.
- Automatic point awards based on 1st/2nd/3rd place.
- Direct editing of a school's cumulative total.
- Public write access to results or photos.
- Building a social feed/chat or a native mobile app.
- Browser-to-Drive upload unless explicitly approved (Phase 2).

## 4. Functional acceptance criteria

### FR-01 — School creation

**Given** an authorized editor is on School Manager, **when** they submit a valid school name, **then** a unique school is created for the selected edition and appears in admin lists and public leaderboards. New schools start at **0 points**. Duplicate identity/code is rejected; archiving never silently erases historical scores.

### FR-02 — Categories

All six named categories exist for an edition. Admin event forms select one category from Convex-managed records. Category slugs are stable. `Common Category` is a distinct category; its score is **not duplicated** into the other five category leaderboards.

### FR-03 — Event creation and status

An editor can create an event with title, category and scheduled time, optionally venue/description. Event status is changed explicitly by an authorized admin. Public schedule reflects status changes reactively. **Completing an event does not automatically publish results.**

### FR-04 — Manual score drafting

An authorized editor can select an event, add one or more result entries per school (when legitimately needed), enter points, and save a **draft revision**. Saving drafts does **not** change public totals. Required fields and score ranges are validated in Convex, not just UI.

### FR-05 — Result publication

A super admin reviews a per-school **before / after / delta** preview, confirms publication, and triggers **one atomic Convex mutation** which switches the event's active published revision, adjusts category totals, and writes an audit record. Repeat publication never counts entries twice.

### FR-06 — Correcting or revoking scores

A published revision cannot be edited in place. Authorized corrections create a new draft derived from the current official result. On confirmation, old contributions are subtracted and replacement contributions added **exactly once**. Revocation requires a reason and removes the active contribution atomically.

### FR-07 — Scoreboards and leaders

- **Category score** = sum of manual points in the active published revisions of events in that category for that school.
- **Overall score** = sum across all six categories, including Common Category **once**.
- Show schools sorted by points descending. Equal totals are tied, **not** artificially separated by name.
- Display three leading distinct schools in “Who's Leading?”; preserve clear tie labels. Award-specific tie policy is open.
- A public Convex subscription updates affected views without manual refresh after publish/revoke/correct.

### FR-08 — Event results and winners

Results view displays only active published result entries. When an event is completed without published results, show **Results pending**, not invented winners. Placement is explicitly entered/approved; **points alone do not infer a winner**, unless a future rule is approved.

### FR-09 — Gallery

An admin registers or curates approved Google Drive images. Media must be approved and have alt text and confirmation of necessary photo permissions. Public queries never return hidden/draft media. Broken files display a graceful placeholder. Google credentials stay server-side.

### FR-10 — Authorization and audit

Anonymous users can read public results but cannot invoke admin operations. A valid login alone is insufficient: the account must exist in an active admin allowlist and have permission. Every official result publication/correction/revocation writes an audit log with actor/time/reason.

## 5. Product rules and edge cases

| Rule | Required behavior |
|---|---|
| Result draft present alongside official result | Public sees **official revision** only. |
| Event has zero official results | Show “Results pending” or “Not published,” never placeholder scores. |
| School name edited | Past point records remain linked by immutable school ID. |
| Two admins publish competing drafts | Stale preview rejected; ask admin to refresh. |
| Repeated publish request | No-op if same revision already active. |
| Category changed after results published | Prohibit normal edit; require audited privileged migration. |
| Common Category | Separate category leaderboard; contribute once to overall. |
| Multiple result entries for one school in an event | Allowed; each legitimate row contributes once. |
| No events / no schools / no photos | Helpful empty states, no fake data. |
| Public page disconnected | Show reconnecting/error state and latest available display if supported. |

## 6. Non-functional requirements

| Area | Acceptance target |
|---|---|
| Usability | Responsive smartphone/tablet/desktop layouts; admin forms operable on mobile. |
| Accessibility | Semantic landmarks, keyboard controls, labeled inputs, clear focus and live-status wording. |
| Security | All admin authorization enforced inside Convex functions; no shared password in client source. |
| Consistency | Single transaction for official score activation and deltas. |
| Performance | Index-driven queries; paginate galleries and history; do not load all result rows on every page. |
| Real-time | Multiple open spectator tabs observe publication without refresh; verify in end-to-end tests. |
| Privacy | Avoid storing or showing student identities unless organizers approve; protect photo permissions. |
| Operations | Separate dev/prod environments; rehearsal, exports/reconciliation and manual tally fallback. |

**Load assumption (not a promise):** Test with approximately 500 concurrent visitors until school provides better numbers. Record actual performance and Convex/Vercel/Drive usage.

## 7. MVP delivery order

1. **Foundation:** Next.js project, Convex schema, initial edition and six category seeds.
2. **Admin authentication + schools:** First admin bootstrap, allowlist, school CRUD.
3. **Events + schedule:** Event creation/status, real public schedule.
4. **Scoring vertical slice (highest priority):** Draft → preview → publish → real-time category/overall boards → correction/revoke.
5. **Gallery + content:** Drive curation, approved gallery, about/settings.
6. **Readiness:** Permissions, tests, mobile polish, load/reconnect testing and deployment rehearsal.

**P0 completion definition:** From a clean database, a permitted admin can create a school, create an event in a valid category, draft points, publish them, and see updated public school/category/overall rankings in another browser session without refresh; a correction produces the right totals.

## 8. Decisions the organizer still needs to make

- School and event names, event dates, venues and timezone (default display timezone `Asia/Kolkata`, pending school approval).
- Exact point constraints (integer/decimal, negative penalties, maximum points), tie/placement policy.
- Whether participants/team names may appear publicly.
- Admin accounts, preferred sign-in provider and who may publish official results.
- Photo ownership, consent process and whether Drive files will be manually linked or uploaded through the site.
- Final design fidelity, logo/brand colors, domain and expected traffic.

## 9. Agent instructions

- Scope is defined here; **implementation authority** lives in `techspc.md`, **data contracts** in `database.md`, **screens/transitions** in `appflow.md`. `architectur.md` and `plan.md` provide broader background.
- Do not invent official events, schools, points, participant names, dates or domain. Use development-only labeled fixtures.
- Implement vertical slices and test backend constraints before polishing UI. Report any unresolved working default before treating it as an organizer decision.
