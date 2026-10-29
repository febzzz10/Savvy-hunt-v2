# Savvy Hunt — Complete UI/UX Design Specification

> **Document:** `design.md`  
> **Version:** 1.0 — Approved visual direction, 29 October 2026  
> **Audience:** Coding agents, front-end developers, designers, QA engineers  
> **Project:** Savvy Hunt — live school-event website and administrative platform  
> **Primary visual reference:** `savvy_hunt_school_event_platform_mockup.png` (place beside this document in the repository, if available)

---

## 0. EXECUTIVE DIRECTIVE FOR THE CODING AGENT

Redesign **the complete existing Savvy Hunt web experience** to match the visual language in the supplied multi-page mockup: a **bright, nature-inspired, editorial school-event website**, with warm ivory backgrounds, sage accents, deep green *used sparingly*, authentic event photography, carefully rounded interfaces, and clean, functional data presentation.

**This is an implementation specification, not permission to rebuild the application.** Examine the existing repository before changing anything. Retain the existing Next.js App Router + React + TypeScript + Tailwind CSS architecture and all established Clerk authentication, Convex queries/mutations/subscriptions, Google Drive gallery synchronization/proxying, and authorization rules. Preserve existing route behavior and data semantics. Never overwrite the live application with a disconnected demo.

**Design quality matters as much as functional correctness:** the UI must not look like a generic AI-generated landing page. Use a deliberately composed layout, thoughtful photo selection, credible event-specific details, consistent typography, authentic copy, and intentional empty/loading/error states. **Avoid** random illustrations, decorative blobs, heavy gradients, neon accents, generic stats, excessive pills, and endless identical card grids.

> **Design interpretation:** The visual reference is directional, not pixel-accurate source of truth. It includes illustrative photographs, example labels, and demonstration results. **Do not populate production with any of those fictional assets, schools, events, scores, or winners.** Real data must come from the existing backend. Where no data exists, render a compelling honest empty state.

### Scope

Redesign:

- Shared shell: global navigation, responsive menu, connection indicator, footer, buttons, inputs, badges, notifications, skeletons, empty states and dialogs.
- Public: `/` homepage, `/scoreboard`, `/schedule`, `/results`, `/snapshots`, `/about`.
- Admin: `/admin` and every existing admin sub-route and sign-in/unauthorized state, **without changing permission boundaries**.
- Responsive treatment for mobile, tablet, laptop and desktop.

**Out of scope:** Backend rewrite, database replacement, auth replacement, changing competition rules, seeding fictitious content, opening private gallery photos, or silently changing event statuses/score calculations.

### Order of precedence

1. Existing **security, role checks, consent enforcement and official-data semantics**.
2. Existing database/query contracts and documented requirements.
3. This document's intended user experience and visual system.
4. Generated mockup's layout and styling details.

If a mockup conflicts with actual functionality, keep functionality and visually adapt it.

---

## 1. PRODUCT IDENTITY & DESIGN PHILOSOPHY

### 1.1 What Savvy Hunt is

An official school-event experience where visitors can discover programmes, follow current and upcoming events, see published results, explore school-wise and category-wise standings, identify leading schools, and browse approved event photographs. Authorized organizers manage events, schools, results, announcements and photos.

### 1.2 Intended impression

- **Festive, not childish.** Captures the anticipation of school competitions.
- **Premium, not corporate.** Refined type and spacing with approachable controls.
- **Natural, not dark.** Sunlit campus atmosphere, warm white backgrounds and soft sage.
- **Credible, not flashy.** Real-time information is official and trustworthy.
- **Custom, not templated.** Specific layouts for leaderboards, timetables, results and photography.
- **Fast, not animation-heavy.** Crisp initial rendering and frictionless navigation.

### 1.3 Visual rules — MUST

1. Keep **approximately 85–90% of the viewport light**. Deep green is for CTAs, small branded areas, active controls, text accents—not giant solid panels.
2. Give **typography, hierarchy and real images** the job of creating visual impact.
3. Use **rounded rectangles with restraint**; not every item should have a pill or card.
4. Use whitespace and fine borders instead of large colored dividers and heavy shadows.
5. Use photographs **only when approved/authentic** and with responsible consent handling.
6. Make the event status, score, rank, date and result publication state instantly understandable.
7. Use a small set of semantic colors consistently; green must never alone convey meaning.
8. A component should exist only if it communicates information or performs an action.
9. On a page with zero content, do not leave a blank beige screen; provide an intentional state and a useful navigation action.
10. Accessibility, performance and mobile usability are first-class design requirements.

### 1.4 Avoid the "AI-generated UI" look

**Do not use:** floating 3D objects, glowing orbs, unrelated abstract shapes, multi-color gradients, glassmorphism, excessive blur, repetitive 3-up cards, huge uninformative counters, emoji icons as permanent UI, fake testimonials, exaggerated marketing adjectives, motion on every element, or useless search bars.

**Do use:** a tailored event masthead, purpose-built scoreboard, publication indicators, authentic photo editorial layouts, credible information density, modular page rhythm, restrained motion, and clean page-specific compositions.

---

## 2. COLOR SYSTEM

The reference's nature-inspired green is welcome; **the whole website must not become dark green**. Use color as an accent on a bright, warm foundation.

### 2.1 Brand and surface tokens

| Token | Hex | Intended use |
|---|---|---|
| `--color-canvas` | `#FAFAF6` | Main warm ivory page background |
| `--color-surface` | `#FFFFFF` | Navigation, content panels, form surfaces |
| `--color-surface-soft` | `#F3F6EF` | Gentle sage-tinted backgrounds / section strips |
| `--color-surface-sage` | `#E5EDDF` | Featured contextual areas and selected segments |
| `--color-primary` | `#32643B` | CTAs, selected filters, anchor emphasis |
| `--color-primary-hover` | `#285130` | Hover/pressed primary controls |
| `--color-primary-light` | `#EDF5E9` | Subtle brand backgrounds |
| `--color-ink` | `#1F2A23` | Main text and large typography |
| `--color-ink-secondary` | `#606F62` | Body descriptions and secondary labels |
| `--color-border` | `#DEE5DA` | Borders, lines, table separators |
| `--color-terracotta` | `#D96B4E` | Sparing festival/attention accent |
| `--color-gold` | `#C59439` | First-place details / award accents |
| `--color-silver` | `#7F8A90` | Second place |
| `--color-bronze` | `#AF794F` | Third place |
| `--color-focus` | `#32643B` | Visible focus outline (with contrasting offset) |

Text on the primary green should be white. Use the ink color for general text rather than a highly desaturated green that becomes hard to read. Confirm final contrast in code, including tinted badges and photo overlays.

### 2.2 Semantic status colors

| Meaning | Background | Text | Additional cue |
|---|---|---|---|
| Live / In progress | `#FDEDE5` | `#A24329` | Pulsing dot if motion allowed + word "LIVE" |
| Upcoming | `#E8F2E5` | `#285D35` | Calendar icon / label |
| Completed | `#EDF0ED` | `#48564C` | Check icon / label |
| Cancelled | `#FCEAE7` | `#9F342D` | Explicit word "Cancelled" |
| Result published | `#E8F2E5` | `#285D35` | "Official" or "Published" label |
| Pending / Awaiting results | `#FFF4DD` | `#7A5716` | Clock / text |
| Error / disconnected | `#FCEAE7` | `#9F342D` | Icon and text |

**Never render an event as live or upcoming solely because of its date** unless the existing backend defines that contract. Respect actual backend status and established status transitions.

### 2.3 Color distribution

- 65–75% white/ivory: main canvas, top bar, results, schedule tables.
- 15–20% pale sage: section highlights, search/navigation strip, selected filters, featured cards.
- 5–10% green: primary actions, rank numerals, active navigation and icons.
- <5% terracotta/gold: live flags, trophy or editorial punctuation.

---

## 3. TYPOGRAPHY, ICONS, IMAGERY

### 3.1 Font pairing

- **Editorial heading:** `Fraunces` or a comparable high-quality readable serif, loaded through `next/font` if available. Use it for homepage hero, main public-page titles, featured quotations and selected editorial section headings.
- **Interface/body:** `DM Sans` or `Inter`, loaded through `next/font`. Use it for navigation, category tabs, cards, score tables, inputs, dates and admin dashboard.
- **Numbers:** Use tabular lining numerals in rank/points/date/time data (`font-variant-numeric: tabular-nums`).
- Avoid excessive letter-spacing, inconsistent font weights, or decorative script fonts. Body text must remain easy to scan.

### 3.2 Type scale (responsive)

| Element | Desktop | Mobile | Weight / notes |
|---|---|---|---|
| Homepage main headline | `clamp(3.75rem, 6vw, 6.5rem)` | `clamp(2.75rem, 10vw, 4rem)` | Serif, slightly tight tracking |
| Public page title | `clamp(2.5rem, 4vw, 4rem)` | `2.25–2.75rem` | Serif |
| Section heading | `1.6–2rem` | `1.45–1.7rem` | Serif or confident sans |
| Card/feature title | `1.1–1.4rem` | `1.05–1.2rem` | Sans medium/semibold |
| Body | `1rem` | `1rem` | Line height 1.5–1.65 |
| Supporting text | `0.875rem` | `0.875rem` | Accessible contrast |
| Labels / metadata | `0.75–0.8125rem` | `0.75rem` | Avoid letterspacing that harms readability |
| Score / podium number | `2–3.5rem` | `1.8–2.7rem` | Bold sans, tabular |

### 3.3 Icons

Use the project's existing icon library, or Lucide React **only if already installed or justified**. Consistent 16–20px strokes, no decorative emoji substitutes. Common icons: CalendarDays, MapPin, Trophy, Search, ArrowUpRight, Clock, Camera, Shield, ChevronRight, Check, Menu, X, LoaderCircle.

### 3.4 Photography and rights

- Source public gallery content **only from the application's approved Google Drive image flow**; maintain its proxy and consent rules.
- The mockup's campus/crowd images are **visual placeholders**, **not actual Savvy Hunt records** and not automatically licensed for live use.
- Never silently display stock or AI-generated photographs as documentary evidence of the school event.
- Where no approved hero photo exists, use a strong typographic ivory/sage composition with subtle approved logo/graphic—not a fake celebration photo.
- Prefer horizontal campus/event images for hero; use a responsive `next/image` implementation wherever compatible with the secured image proxy.
- Crop intentionally (`object-fit: cover`, `object-position` per asset), preserve focal areas, and add a sufficient text scrim only when text overlaps images.
- Add meaningful alternative text or empty alt for purely decorative photos; never expose private original Drive URLs in public markup.

---

## 4. SPACING, GRID, SHAPES, ELEVATION

### 4.1 Layout grid

- Desktop maximum content width: **1280px**. Typical page width 1150–1240px inside it.
- Outer horizontal padding: `24px` tablet, `40px` desktop, `16–20px` mobile.
- Desktop 12-column layout, `24px` gutters; tablet 8-column; mobile 4-column / stacked.
- Large section rhythm: `72–104px` desktop, `44–64px` mobile.
- Normal card gaps: `16–24px`.
- Body text measure: around `60–72ch` where practical; keep narrow text columns in hero.

### 4.2 Shape system

| Element | Radius |
|---|---|
| Hero image/content panel | `24–28px` |
| Featured cards, galleries | `16–20px` |
| Standard cards/inputs | `12–16px` |
| Buttons | `10–14px` |
| Small badges | `8px` or full-pill only for status chips |
| Data tables/rows | Small `8–12px` outer wrapper; dividers instead of cards for each row |

Use modest shadows: `0 6px 24px rgb(31 42 35 / 0.06)` at most for emphasized cards, usually none. Hover elevation should be subtle, never jumpy. Most borders are 1px.

### 4.3 Interaction geometry

- Interactive hit area >= `44×44px` wherever possible.
- Primary buttons: height `46–52px`, medium-bold text.
- Inputs: height `44–48px`, labels always visible.
- Give navigation and filters clear focus-visible treatments.
- Avoid nested buttons/links and pseudo-clickable inert cards.

---

## 5. GLOBAL SHELL

### 5.1 Header and navigation

**Desktop:** Thin, bright header with Savvy Hunt monogram/wordmark on left. Links: **Scoreboard, Schedule, Results, Snapshots, About**, with **Admin** placed last. Allow a small home link through the logo. Navigation has restrained active underline or text treatment—not a giant primary-colored selected pill.

**Mobile:** Logo left, accessible menu button right. Expand a tidy menu panel with all routes, active state and a clearly labeled Admin link. Close on navigation/escape/outside click as applicable; manage focus correctly. Avoid horizontally clipped global nav.

**Behavior:** Logo routes to `/`. Active page is derived from routing. Header must not cover page content. A sticky header may be used if testing shows it does not crowd small screens.

### 5.2 Real-time connection status

The existing public site shows a large "Live updates connected" bar. Replace it with a **subtle, accessible status affordance** in the header vicinity or near the scoreboard header:

- Connected: small green dot and "Live updates" or "Connected".
- Reconnecting: neutral dot, "Reconnecting…".
- Offline: warning treatment, "Connection lost — retrying".
- Do not claim "LIVE" events are occurring when the application connection is healthy but there is no live event.
- Preserve the hydration-safe connection-state implementation; do **not** reintroduce SSR/client mismatch. Announce meaningful connection changes politely, not continuously.

### 5.3 Footer

Simple, light footer with logo, small navigation grouping, event/organizer information **only if configured**, copyright year, and no invented sponsor badges or social links. On short pages, footer should still sit naturally at the bottom without enormous blank space.

### 5.4 Shared UI primitives

Create or refine reusable: `SiteHeader`, `MobileNav`, `SiteFooter`, `ConnectionIndicator`, `PageIntro`, `SectionHeader`, `PrimaryButton`, `TextButton`, `StatusBadge`, `CategoryTabs`, `FilterBar`, `FormField`, `EmptyState`, `Skeleton`, `ErrorState`, `ConfirmDialog`, `EventRow`, `SchoolRankRow`, `Podium`, `PhotoTile`, `AnnouncementBanner`.

Reuse the existing design system/component primitives when possible instead of duplicating them. Do not introduce a whole additional component framework for cosmetic work.

---

## 6. PAGE 01 — HOMEPAGE (`/`)

### Goal

Within 3 seconds visitors should know **what Savvy Hunt is, what is happening, who is leading, and where to go next**. This page needs the most memorable art direction.

### 6.1 Desktop layout outline

```
[Clean light navigation: logo | scoreboard | schedule | results | snapshots | about | admin]
[Small contextual connection indicator]

┌────────────────────── HERO (contained, 2-column) ─────────────────────────┐
│  Left: large "Savvy Hunt" editorial headline       Right: approved       │
│  Short clear description + 2 actions                event/campus photo    │
│  Minimal status cue                                 (or designed fallback)│
└────────────────────────────────────────────────────────────────────────────┘
          [Overlapping / adjacent pale-sage quick-access strip]
          [Live now] [Upcoming events] [Latest results] [Search if functional]

[Leading schools / top 3]  [Upcoming feature event]  [Snapshots mini gallery]

[Now happening / recent official announcements — only where data exists]
[Recent official results / winners]
[Simple footer]
```

### 6.2 Hero

- Contained 2-column composition, approximately 55% text and 45% photo at desktop.
- Warm ivory/sunlit photograph, not a dark forest banner. Cropping should support the headline visually.
- Eyebrow: "THE SCHOOL EVENT, LIVE" **only if appropriate as brand slogan, not as a claim an event is currently live**. Safer evergreen: "SAVVY HUNT · OFFICIAL EVENT HUB".
- Main title: **Savvy Hunt** (serif, confident, human-scale, not a giant distorted all-caps stack).
- Supporting copy: "Events, school standings and official results — all in one place." or similar accurate sentence.
- Primary CTA: **View scoreboard** → `/scoreboard`.
- Secondary CTA: **Explore the schedule** → `/schedule`.
- May include a small real event photo caption, if available and approved.
- Use a designed typographic/photo-free fallback if no approved image exists.

### 6.3 Contextual quick-access strip

Take inspiration from the reference's rounded green search bar, **but adapt its function**:

1. **Live now**: current live-event summary, or "No event is live right now".
2. **Next up**: nearest scheduled event with real time, or "Schedule to be announced".
3. **Latest results**: latest official publication, or "Results pending".
4. Optional search: only if a functional search already exists or can be implemented safely against available data; otherwise **omit search entirely**.

Use a pale-sage surface and a white inner surface only where useful. Do not turn it into a nonfunctional visual control.

### 6.4 Lower homepage: bespoke composition

**A. Leading schools (left)**: Show up to top 3 by official overall standings, using clean ranked rows rather than elaborate fake trophies. Include `View full scoreboard`. If no official points have been published, show: "The leaderboard will appear when results are published." Avoid claiming a #1 leader on all-zero scores.

**B. Next event (center)**: Show the next genuinely upcoming event; category, date/time and venue (or "Venue to be announced"). If no upcoming events, show a compact informative empty state and link to schedule.

**C. Snapshots (right)**: Use an editorial `2×2` collage of up to four approved images. If none are approved, show a styled photo placeholder/empty note with a link to `/snapshots`—no stock photos disguised as event images.

**D. Announcements / recent results**: Include visually lightweight sections only if the product data exists; optional stacked cards with timestamps. Published results must be differentiated from pending results.

### 6.5 Responsive behavior

- Desktop: split hero + three unequal editorial modules.
- Tablet: split hero with smaller image or vertically arranged feature columns.
- Mobile: headline and actions first, approved hero photo second, quick-access becomes vertical/scroll-safe, lower sections stack as full-width content.
- Avoid images overlapping important text. A mobile visitor should see the title and primary CTA above the fold on common devices.

---

## 7. PAGE 02 — SCOREBOARD (`/scoreboard`)

### Goal

A live, scannable and trustworthy view of **overall and category-wise official school standings**.

### 7.1 Page header

- Title: "Scoreboard".
- Subtitle: "Official school standings across all categories.".
- Small connection indicator, as specified above.
- Optional narrow approved campus/banner image behind only the header; **not required**. Never sacrifice contrast for atmosphere.

### 7.2 Category selection

Exact available tabs:

`Overall` · `Category I` · `Category II` · `Category III` · `Category IV` · `Category V` · `Common Category`

- Use selected green segment/tab and muted unselected tabs with clear focus state.
- On mobile, the tab row can scroll horizontally with visible affordance or use an accessible category dropdown; do not shrink labels until unreadable.
- Switching categories updates subscribed data in place and preserves the existing scoring calculation behavior.
- Ensure `Common Category` remains distinct and accurate according to backend data.

### 7.3 Top three / podium

- Visible **only when official scoring has established meaningful leaders**; do not crown arbitrary schools with zero points.
- Genuine top three school entries, real names and points from Convex.
- First place subtly emphasized using warm ivory/gold border. Second and third remain balanced—not cartoon medals.
- Handle **ties accurately**: if three or more schools share rank 1, the presentation must not falsely assign rank 2 and rank 3. Prefer a tied-leader row or adapt the podium to ranking rules from backend. Do not invent tie breakers.
- Mobile: podium becomes stacked ranking cards or compact ordered rows.

### 7.4 Standings data table

Columns: `Rank` | `School` | `Official points`.

- Rank large enough to scan, points right-aligned with tabular numerals.
- Light horizontal dividers; subtle alternate row hover and no excessive boxes.
- For tied ranks, repeat true rank and optionally add a **Tied** label.
- Preserve true school names, including long names, with responsive wrapping rather than destructive truncation.
- Maintain backend sort order and ranking semantics. Never sort rank by formatted points strings.
- 0-point schools may appear in the complete table where applicable, but the UI must clearly distinguish **no published scores** from a completed zero score if the data model allows it.
- Show an intentional loading skeleton, official-results-pending empty state, and retryable error state.

### 7.5 Live updates

Use existing Convex subscriptions. Score changes should update without refresh and preserve user selection. Avoid distracting row animations; a small transient highlight is permitted if it does not interfere with reading and honors reduced motion.

---

## 8. PAGE 03 — EVENT SCHEDULE (`/schedule`)

### Goal

Help visitors identify what is **live, upcoming, completed or cancelled**, and when and where each event occurs.

### 8.1 Header and filter bar

Title: "Event schedule". Subtitle: "Follow every event as it happens.".

Controls:

- `Status`: All statuses / existing supported statuses.
- `Category`: All categories / six defined categories.
- `Date`: accessible calendar date field with clear/remove option when needed.
- Optional text search **only if implemented and useful** for the actual event dataset.

Each control must have persistent visible label. Filter changes are reflected instantly and may be encoded in URL query parameters if consistent with project practices.

### 8.2 Event list

Prefer **clean wide rows on desktop** (not repetitive 4-column miniature cards) and intelligently stacked cards on mobile:

```
[UPCOMING]  Event title                 [date & time] [venue] [chevron]
            Category II · subtitle
```

- Event title, actual status, category, formatted date/time, venue/"To be announced".
- Date uses app's established event timezone and localization; do not guess timezone for persisted timestamps. For this school event, if the project is explicitly configured to `Asia/Kolkata`, preserve that.
- Group by day when many events are listed, with a subtle sticky date heading only if useful.
- Event click navigates to the established event-detail route if available. Otherwise make rows non-clickable, not dead links.
- Show cancelled events in a muted style, with status text never relying solely on color.
- Empty state: "No events match your filters" and a working `Clear filters` button.
- Maintain responsive width and avoid truncating date/time at 320px.

---

## 9. PAGE 04 — OFFICIAL RESULTS (`/results`)

### Goal

Surface only **published official results**, with clear category and school filtering.

### 9.1 Structure

- Header: "Official results".
- Subtitle: "Published results and final placements for each event.".
- Filter controls: **Category**, **School**; optionally date/event only if existing data supports it.
- Publication timestamp in a secondary line when available.

### 9.2 Published result blocks

Each event result block should communicate:

- Event name and category.
- Published / official state.
- Date/time where provided.
- Actual placements, school and awarded points as represented in the backend.
- Optional authentic approved photo, but only if an authorized association already exists.
- Clearly clickable detail action when supported.

Do **not** present fabricated sample events such as "Cultural Night" or "Inter-School Quiz" from the mockup as real published records.

### 9.3 States

- No published results: an attractive, **truthful** message "No official results published yet" and a link to the schedule.
- No filter matches: "No results match these filters" with reset control.
- Loading: appropriately sized skeletons; error: action to retry.
- Unpublished/draft results must never leak to public output or ranking aggregation.

---

## 10. PAGE 05 — SNAPSHOTS (`/snapshots`)

### Goal

Make approved event photography a beautiful, curated part of the experience.

### 10.1 Gallery layout

- Header: "Snapshots". Subtitle: "Moments from Savvy Hunt.".
- For desktop: intentional masonry-style or CSS grid of mixed image aspect ratios. Avoid extreme layout shifts.
- Tablet: 2–3 columns; phone: 1–2 columns based on width.
- Use `aspect-ratio` reservations, subtle corners, and no heavy card chrome.
- Click opens an accessible fullscreen/lightbox view: focus trap, ESC close, next/previous if available, captions, navigation, image alt text, clear close button, return focus to originating tile.
- If gallery already has category/filter labels, preserve them; **do not invent new tagging taxonomy** for an unimplemented backend.
- Display title/caption/credit only if provided and approved.

### 10.2 Critical gallery safety / functionality

The existing system uses **Google Drive direct uploads, service-account read-only sync, approval workflow, consent enforcement, private image proxy, metadata editing, hiding, ordering and duplicate prevention**. Retain all of it.

- Public gallery queries must expose **approved, visible, consent-cleared** images only.
- Do not expose Google Drive file identifiers as downloadable private links or remove the secure image proxy.
- Never re-introduce Google OAuth or website-side photo upload unless explicitly requested.
- Pending/rejected photos must remain invisible on public pages.
- Admin gallery and public gallery should share visual style but use separate authorized queries.
- No approved photos: an editorial camera/photo-themed empty state with "Photos will appear here after they are approved." Do not silently replace them with fake event imagery.

---

## 11. PAGE 06 — ABOUT (`/about`)

### Goal

Explain the event clearly, without generic marketing filler or invented information.

### Layout

- Hero heading: "About Savvy Hunt".
- One honest sentence describing the event's purpose (editable if admin-managed content exists).
- Two-column editorial layout: narrative/structured info on left; approved school/event image on right, or a text-led fallback.
- Sections: **About the event**, **Event categories**, **How results work**, **Event information** (only where source data is available).
- Categories: Category I, II, III, IV, V and Common Category; render an elegant list or compact grid, not six empty ornamental cards.
- Optional quick links: Schedule, Scoreboard, Snapshots.
- Organizer identity, venue, dates, school count and contact details must come from approved configured content only. No invented address or social account.

---

## 12. ADMIN EXPERIENCE (`/admin` AND EXISTING CHILD ROUTES)

### Goal

Give organizers a calm, dependable workspace while keeping the public site's design DNA.

### 12.1 Authentication and authorization

**Clerk is the existing authentication provider.** Use established Clerk sign-in UI/flows and redirects. Do **not** replace Clerk with a locally implemented password form. The mockup's email/password card is visual inspiration only.

Preserve:

- Existing allowlist and role-based access including `super_admin` permissions.
- Backend authorization on every protected Convex mutation and query.
- Revocation checks, super-admin-only admin management, and existing protected routes.
- Approved admin provisioning flow; never reintroduce an unauthenticated bootstrap form.
- Correct unauthenticated vs unauthorized state, with accessible actionable links.

### 12.2 Admin layout

- Desktop: light sidebar or compact horizontal management tabs; choose based on existing navigation structure. Maintain the existing route hierarchy.
- Topbar: page title, current user's verified identity as provided by Clerk, connection state, menu/sign-out.
- Mobile: collapsible navigation with all existing admin sections; avoid full-screen horizontal forms.
- Calm white forms on ivory background, visible labels, descriptive validation errors and clear save confirmations.
- Prefer tables for management density; prefer cards only for high-level dashboard summaries.

### 12.3 Existing admin capabilities to visually integrate

Where implemented in the repository, preserve their functionality while restyling:

1. **Event control:** create/edit events, schedule, venue, status and category.
2. **School management:** create/edit/archive participating schools if supported.
3. **Scoring and results:** manual event-based scoring, official publication controls, automatic aggregation, audit or history features already present.
4. **Announcements:** publish/edit visible announcements where supported.
5. **Gallery:** sync from Drive (including `Sync Now`), Pending/Approved/Rejected review, consent, metadata editing, hiding, ordering, audit history.
6. **Admin management:** allowlist and roles with super-admin-only access.

Do not invent buttons for operations without a real backend action. Do not make destructive operations one-click without established confirmation and authorization.

### 12.4 Admin design details

- Breadcrumbs or section labels to orient the user.
- Tables: clear column headings, readable dense mode, visible selected filters, pagination if required.
- Forms: `label → input → help/error`, grouped by task.
- Sensitive actions: warning language, confirmation modal, clear undo if already supported.
- Publish/draft changes: visually distinct, never mistaken for immediate public publication.
- Success and error notices: concise, dismissible, announced accessibly.

---


### 12.5 Video-led Event Manager redesign (29 October 2026)

The user supplied a 32-second admin Event Manager video reference. The existing Events page must be redesigned around a compact **Create Event** column and a wider **Event feed** (not merely a Live Feed), with contextual event actions and an accessible **Manage Results / Publish Winners** dialog. The dialog should allow school-based first/second/third placement management and tied winners **where supported by the existing backend**, while respecting configured point rules and event-based manual scoring. The video example's admin passcode and 10/6/2 points are **not Savvy Hunt requirements**. See the complete appendix at the end of this document or `ADMIN_EVENTS_VIDEO_REFERENCE.md`.

## 13. COMPONENT & DESIGN-TOKEN IMPLEMENTATION

### 13.1 Suggested structure (adapt to existing repo)

```
app/
  page.tsx
  scoreboard/page.tsx
  schedule/page.tsx
  results/page.tsx
  snapshots/page.tsx
  about/page.tsx
  admin/...
components/
  site/
    site-header.tsx
    mobile-navigation.tsx
    site-footer.tsx
    connection-indicator.tsx
  home/
    home-hero.tsx
    quick-access-strip.tsx
    leading-schools.tsx
    next-event.tsx
    gallery-preview.tsx
  scoreboard/
    scoreboard-tabs.tsx
    leaders-podium.tsx
    standings-table.tsx
  schedule/
    schedule-filters.tsx
    event-row.tsx
  results/
    results-filters.tsx
    official-result-card.tsx
  gallery/
    photo-grid.tsx
    photo-lightbox.tsx
  ui/
    status-badge.tsx
    section-heading.tsx
    empty-state.tsx
    loading-skeleton.tsx
    ...
```

**Not mandatory:** Preserve current file conventions and replace/extend components rather than introducing redundant parallel implementations.

### 13.2 CSS variables / Tailwind theme example

Adapt to whatever Tailwind version is already installed; do not migrate versions just for aesthetics.

```css
:root {
  --sh-canvas: #fafaf6;
  --sh-surface: #ffffff;
  --sh-soft: #f3f6ef;
  --sh-sage: #e5eddf;
  --sh-primary: #32643b;
  --sh-primary-hover: #285130;
  --sh-ink: #1f2a23;
  --sh-muted: #606f62;
  --sh-border: #dee5da;
  --sh-terracotta: #d96b4e;
  --sh-gold: #c59439;
  --sh-radius-card: 18px;
  --sh-radius-control: 12px;
  --sh-content-max: 1280px;
}

/* For Tailwind CSS v4 projects, optionally expose named utilities: */
@theme inline {
  --color-sh-canvas: var(--sh-canvas);
  --color-sh-surface: var(--sh-surface);
  --color-sh-soft: var(--sh-soft);
  --color-sh-sage: var(--sh-sage);
  --color-sh-primary: var(--sh-primary);
  --color-sh-ink: var(--sh-ink);
  --color-sh-muted: var(--sh-muted);
  --color-sh-border: var(--sh-border);
}
```

If the project uses Tailwind v3, map the same variables in `tailwind.config` or use the project's existing utility conventions. This example is **not** a direction to replace global CSS wholesale.

### 13.3 Composition & code quality

- Keep presentation separated from Convex subscriptions and mutations where possible.
- Use the current generated Convex bindings and existing query names—do not guess schemas or create parallel backend tables.
- Prefer server components for static layout when appropriate; use client components only where interaction/subscriptions demand them.
- Never hardcode sample/verification schools or scores into real page components.
- Prefer typed props, stable React keys, and consistent loading/error cases.
- Use links for navigation, buttons for actions.
- Use proper `aria-current`, `aria-pressed`, table headers and input associations.
- Do not bypass established auth boundaries for design convenience.

---

## 14. RESPONSIVE REQUIREMENTS

| Breakpoint | Layout |
|---|---|
| `320–479px` small mobile | Single-column content, mobile nav, stacked filters, compact stats, simple leaderboard |
| `480–767px` large mobile | Flexible photo grid, wrapped buttons, readable schedule rows/cards |
| `768–1023px` tablet | 2-column content where helpful, compact nav or menu depending on available width |
| `1024–1279px` laptop | Desktop nav, structured homepage with balanced columns, table layouts |
| `1280px+` desktop | Full 12-column compositions, constrained max width, editorial whitespace |

**Test viewport widths:** 320, 375, 390, 430, 768, 1024, 1280, 1440 and 1920 pixels.

### Special responsiveness

- No horizontal body scrolling at any viewport size.
- Category tabs scroll or collapse gracefully without clipping `Common Category`.
- Date and school names should wrap without breaking the event/score structure.
- Buttons never become smaller than tappable size.
- Tables: prefer structured mobile rows or accessible scroll container with a visible cue; never shrink all text to microscopic sizes.
- Photo grids maintain ratios and not cause page jump while loading.
- Navigation remains keyboard accessible and focus-managed on mobile.

---

## 15. INTERACTION & MOTION

### 15.1 Allowed motion

- Hover/focus transitions: 120–180ms, ease-out.
- Page section subtle appearance (optional): ≤300ms, only if it does not delay content visibility.
- Status dot: optional gentle animation only while actual event is live.
- Navigation menu: simple expand/collapse, avoid elaborate curtains.
- Score changes: brief soft background highlight if useful.

### 15.2 Motion restrictions

- Honor `prefers-reduced-motion` by removing nonessential motion.
- Do not auto-rotate carousels; a static photography grid is preferred.
- No parallax, scroll-jacking, giant entrance fades, continuously moving decorative shapes or unnecessary animation libraries.
- Avoid animations that imply the official scores are unstable.

---

## 16. STATES & CONTENT GUIDELINES

Every public/data component must deliberately handle:

| State | Expected UI |
|---|---|
| Loading | Stable-size skeletons with approximate final geometry |
| Connected, no live event | "No event is live right now"; upcoming link |
| No upcoming events | "The next programme will appear here when scheduled" |
| No published results | "Official results will appear here once published" |
| No leader established | "Leaders will appear when official points are published" |
| Tied schools | Correct repeated rank and visible tie handling |
| No approved photos | Thoughtful approved-gallery empty state |
| Filter returns no matches | State which filter context is empty + `Clear filters` |
| Network disconnected | Clear nonblocking connection state, retry handling |
| Query failure | Friendly explanation + retry, without false data |
| Sign-in required | Correct Clerk sign-in path |
| Signed in but unauthorized | Access denied message, no protected data leakage |
| Admin save/publish error | Inline validation and non-destructive recovery |
| Event cancelled | Explicit labelled cancelled state; do not hide silently |

### Copywriting style

- Clear, short, human and event-specific.
- Avoid marketing filler such as "unleash the power of seamless experiences".
- Prefer "Official results" over "epic winners" in serious result contexts.
- "Live updates connected" is a network state, **not** a guarantee an event is live.
- Use "Venue to be announced" only when venue value is genuinely missing.
- Never invent totals, countdowns, winners, sponsor logos, dates or achievements.

---

## 17. ACCESSIBILITY

Target **WCAG 2.2 AA** where feasible.

Checklist:

- Semantic `<header>`, `<nav>`, `<main>`, `<section>`, `<footer>` and correctly nested headings.
- Body text and controls meet accessible contrast; verify subtle sage labels separately.
- Focus-visible on all interactive elements, including filter chips, dropdowns and photos.
- Full keyboard functionality for nav, filters, tabs, gallery and dialogs.
- Live updates use carefully throttled `aria-live` messages; do not speak every score rerender.
- Tables use `<caption>` where helpful, `<th scope>` and meaningful headers.
- Accessible form labels, required indicators and validation messages.
- Screen-reader-friendly event status; never only red/green color.
- Lightbox has focus trap, ESC-to-close, restore-focus and image context.
- Touch targets at least 44px whenever practical.
- `prefers-reduced-motion` supported.
- No information provided only on hover.

---

## 18. PERFORMANCE & TECHNICAL QUALITY

### Targets (aspirational, verify in the deployed environment)

- LCP around or under **2.5 seconds** on typical mobile test conditions.
- CLS below **0.1**.
- INP around or under **200ms**.
- No large unnecessary client-side dependencies just for visuals.

### Engineering practices

- Use responsive images, sizes, aspect ratios and appropriate priority for the single LCP hero image.
- Prefer simple CSS layout and motion over animation libraries.
- Self-host fonts via `next/font`; use minimal font weights and suitable fallbacks.
- Avoid unconditional loading of full-resolution gallery photos.
- Keep Convex subscription scope focused; avoid repeated redundant queries.
- Avoid hydration mismatch: client connection data must not alter first server-rendered markup inconsistently.
- Lazy-load lightbox and admin-only heavy widgets when sensible.
- No layout shifts from unloaded image or results skeletons.
- Maintain correct caching/proxy behavior for approved images without exposing originals.

---

## 19. DATA, AUTH AND INTEGRATION GUARANTEES

These are **release-blocking**.

### Authentication / authorization

- Continue using existing **Clerk**, not a new auth solution.
- Preserve active admin allowlist, role verification and super-admin-only protected actions.
- Protected access must be checked server-side/through backend mutations, not only by hiding UI.
- Existing Clerk development-vs-production configuration must remain unchanged unless explicitly tasked.

### Convex

- Continue using the current Convex deployment/environment binding and generated API.
- Do not remove realtime subscriptions.
- Continue manual, event-based scoring and automatic official aggregation.
- Never show unpublished results in public sections.
- Do not change tie, ranking, school and category behavior without explicit requirements and tests.

### Google Drive snapshots

- Keep direct Google Drive upload + read-only service account synchronization.
- Keep two-minute scheduled sync and admin `Sync Now` where currently implemented.
- Keep approval/rejection, consent, private proxy, metadata ordering/hiding and auditing.
- Do not add browser direct Drive access, public Drive links or a new upload API.

### Existing content

- Existing verification/test entries visible in screenshots may be test data. **Do not delete them as a side effect of redesign.** Any data cleanup must be a separate, explicitly reviewed task.
- Keep existing values, identifiers and dates exactly as returned by backend.
- Never replace real data with polished seed arrays.

---

## 20. VISUAL QA & ACCEPTANCE CRITERIA

### 20.1 General visual check

- [ ] UI matches light, sage/ivory, photographic direction from approved concept.
- [ ] Strong visual hierarchy and meaningful page-specific layouts.
- [ ] No random gradients, blobs, glassmorphism or decorative clutter.
- [ ] Headers, footers, buttons, filters, typography and borders are consistent.
- [ ] No giant blank lower viewport with only one line of text; intentional empty state.
- [ ] No oversized empty whitespace or unrelated illustrations.
- [ ] Hero, school rankings and official status are prominent without overwhelming user.
- [ ] All pages remain usable without photographs or published scores.

### 20.2 Functionality checks

- [ ] Main navigation works across all public routes.
- [ ] Mobile menu works with touch and keyboard.
- [ ] Scoreboard overall and six category views load real data and update live.
- [ ] Ranking, points and tied ranks match authoritative backend behavior.
- [ ] Schedule filters work together, reset correctly, preserve status semantics.
- [ ] Public results show published results only.
- [ ] Snapshots show only approved/visible/consented images through secure proxy.
- [ ] Gallery lightbox closes/opens with keyboard and restores focus.
- [ ] Admin sign-in continues through Clerk.
- [ ] Authorized admin operations still work; unauthorized users cannot access them.
- [ ] Admin management remains super-admin-only as before.
- [ ] Empty/loading/offline/error states are deliberate and accurate.
- [ ] No hydration errors, page crashes or navigation failures.

### 20.3 Tests to execute

- Existing repository test suite (unit/integration).
- TypeScript typecheck and lint.
- Production build using configured env; if credentials unavailable, report exactly what couldn't be verified.
- Responsive browser check at required viewport widths.
- Keyboard-only navigation and accessible dialog/filters check.
- Realtime updates and reconnect/offline recovery.
- Public vs admin role access verification.
- Lighthouse/performance review where available, particularly hero image and image gallery.

### 20.4 Screenshot review

Provide before/after screenshots for:

1. Homepage desktop and mobile.
2. Scoreboard desktop, mobile, and tied-rank state.
3. Schedule with active filters.
4. Results with published and empty states.
5. Snapshots with approved photos and empty state.
6. About desktop/mobile.
7. Admin sign-in, dashboard, gallery management, and authorized/unauthorized states.

---

## 21. IMPLEMENTATION PLAN (FOLLOW IN THIS ORDER)

**Phase 0 — Audit and map the existing app**

Inspect file tree, Next.js routes, styling, current components, installed fonts/icons, Convex APIs, Clerk provider and middleware, gallery image proxy and admin access rules. Identify which features exist vs which are depicted only in the mockup. Record baseline tests and relevant screenshots.

**Phase 1 — Visual foundation**

Introduce design tokens, fonts, buttons, inputs, badges, layout grid, responsive header/footer, intentional loading/empty states. Remove conflicting legacy styling without changing data flow.

**Phase 2 — Public-facing layout**

Redesign homepage first, then scoreboard, schedule, results, snapshots and about. Wire all existing live data and queries. Check empty states early before polishing mockup-like populated states.

**Phase 3 — Admin visual integration**

Apply matching components and typography to admin routes, forms, tables, status messaging and protected sign-in wrapper. Keep Clerk/Convex authorization untouched.

**Phase 4 — Accessibility and responsiveness**

Test all target widths, tab keyboard navigation, mobile nav, score tables, filters, lightbox and reduced motion. Fix overflow, hit targets and contrast.

**Phase 5 — Performance and verification**

Run build/test/lint/typecheck, browser smoke tests, hydration checks, realtime updates, reconnect testing and image access checks. Compare screenshot outputs to the approved style reference and fix inconsistencies.

**Phase 6 — Final handoff**

Provide a concise report with changed files, design summary, backend contracts preserved, executed tests, unresolved issues and screenshots. Do not claim "production-ready" unless authentication, integrations, deployment configuration and access control were actually verified.

---

## 22. CODING AGENT START PROMPT

Paste the following instruction to the coding agent **together with `design.md` and the reference image**:

> Implement the complete Savvy Hunt UI/UX redesign described in `design.md`, using `savvy_hunt_school_event_platform_mockup.png` as visual direction. **First inspect the existing repository, map its components and authenticated data flows, and preserve all Clerk, Convex and Google Drive functionality.** This is a genuine production-code redesign, not a static demonstration. Implement all public routes and the existing admin experience, use real data, handle empty/loading/error states, keep published-only public results and approved-only gallery photos, and make the interface responsive and accessible. Follow the staged implementation plan in the specification. Run the repository's tests, lint, typecheck and build; inspect browser output at mobile and desktop sizes. Do not invent official schools, events, scores, photos, or administrative endpoints. Document any limitations and provide before/after screenshots.

---

## 23. FINAL DESIGN DEFINITION

The finished Savvy Hunt should feel like **a real school event with its own visual identity**: morning sunlight, a welcoming campus atmosphere, elegant ivory surfaces, calm sage green, authentic celebrations, clear live information, credible official rankings and enjoyable photography. It should invite exploration because it is beautiful **and useful**, not because it uses gimmicks.

**Final rule:** If a design flourish competes with understanding who is leading, what's happening next, or whether a result is official, remove the flourish.


---

# Appendix — Video-Led Admin Events Detailed Specification

# Savvy Hunt — Admin Events Redesign (Reference Video Adaptation)

> Status: Approved direction pending implementation. 29 October 2026.  
> Target: existing organizer Events interface, not a new application.  
> Visual references: `event-manager-reference.jpg` and `publish-winners-reference.jpg` extracted from the user-provided 32-second reference video.  
> Must also obey the main Savvy Hunt `design.md` specification.

## 1. Intent

Rework the existing `/admin/events` organizer experience into a fast two-column **Event Manager**. The reference video shows a left-side compact event creation form, a right-side event feed, status controls, event metadata, result actions, and a dedicated **Publish Winners** dialog with tied placements. Borrow its **interaction model and efficiency**, not its colors, business rules, authentication method, or database model.

**Non-negotiable:** Keep the real Savvy Hunt architecture: Next.js App Router, TypeScript, Tailwind CSS, Clerk, Convex, and the existing access rules, event controls, event-based manual scoring, automatic school/category aggregation, official publication workflows, and audit history. Do not build a standalone demo or duplicate scoring state.

## 2. Observations from the supplied video

- Light page with a small top header, Back to Dashboard, a Create Event card, and a Live Feed of events.
- Form inputs in the reference: event title, location, team count, status, category, an admin passcode, and Publish Event.
- Event rows show title, results-published badge, venue, team count, category, podium preview, status menu, Results action, trophy action, and delete action.
- Clicking the trophy opens a centered `Publish Winners` modal over a dimmed page.
- Modal groups `1st place`, `2nd place`, and `3rd place`; each group has a participant name and school selector, add-tie action, remove-entry control, and Confirm & Save.
- The example shows 10/6/2 point labels. **These are reference-only numbers and MUST NOT be hard-coded** unless the current Savvy Hunt scoring policy actually uses them.
- The example shows a separate admin passcode. **Do NOT reproduce it**: the existing protected Clerk/Convex authorization is the source of truth.

## 3. Savvy Hunt visual translation

Maintain the main site's light editorial nature-inspired style:

| UI token | Hex | Usage |
|---|---|---|
| Canvas | `#FAFAF6` | Page background |
| Surface | `#FFFFFF` | Cards, dialogs |
| Soft sage | `#F3F6EF` | Selected filters, calm subpanels |
| Green | `#32643B` | Primary actions, active indicators |
| Green hover | `#285130` | Hover |
| Ink | `#1F2A23` | Headings, body |
| Muted ink | `#606F62` | Supporting text |
| Border | `#DEE5DA` | Dividers, fields |
| Terracotta | `#D96B4E` | Live and attention accents |
| Gold | `#C59439` | First-place award highlight |
| Silver | `#7F8A90` | Second-place award highlight |
| Bronze | `#AF794F` | Third-place award highlight |

Use the already-selected site typography and components. Avoid orange-red gradient submit buttons, dark navy dialog header, cartoon emoji icons, giant boxes, and heavy shadows from the video. Use restrained Lucide icons plus clear words; maintain visible focus states. Prefer readable text labels to relying on icon-only actions.

## 4. Desktop layout

```text
Existing ADMIN NAV: Overview | Schools | Events | Scoreboard | Announcements
                   | Gallery | Settings | Admins | Audit | Public site
─────────────────────────────────────────────────────────────────────────────
Organizer workspace                                     Connection status
Events                                     [+ Create event]  [Other safe actions]
Manage, schedule, and publish official event results.
─────────────────────────────────────────────────────────────────────────────
┌─────────────────────────┐  ┌────────────────────────────────────────────┐
│ Create event            │  │ Event feed     [Search] [Status] [Category]│
│ Event title             │  │ [Date] [Sort]                              │
│ Category                │  │                                            │
│ Start date/time (IST)   │  │ Event A     Live · No published results    │
│ End date/time (IST)     │  │ Venue  • Category • Starts at             │
│ Venue                   │  │ Participating schools summary             │
│ Status                  │  │ [Manage] [Enter results] [More ▾]         │
│ Schools/teams (if used) │  │────────────────────────────────────────────│
│                         │  │ Event B     Completed · Results published │
│ [Create event]          │  │ First / second / third summary            │
└─────────────────────────┘  │ [View results] [Edit] [More ▾]           │
                             └────────────────────────────────────────────┘
```

Desktop widths: outer content max 1320–1440px, main left column 340–380px, right column `minmax(0, 1fr)`, gap 24px. The form may be position:sticky within the viewport only if it does not trap lower controls; allow normal scrolling. The right area may be a list, not a separate scroll container unless there is a compelling usability reason. Avoid using the browser's full width for one oversized form as in the current screenshot.

Page header should work within the **existing admin shell**, not create a separate disconnected menu or bypass its existing role-aware links.

## 5. Create Event panel

Keep the actual event fields in the codebase; visually group them into a compact task-focused form:

- **Event title:** required, sensible max length, inline error.
- **Category:** Category I, II, III, IV, V, Common Category; use existing backend IDs/values.
- **Starts at:** local date/time clearly labeled `Asia/Kolkata`.
- **Ends at:** optional; validate it is after start where supplied.
- **Venue:** optional or required according to current schema; useful placeholder.
- **Status:** valid existing statuses only; do not immediately call an event live merely because a select defaults to Live.
- **Participating schools / teams:** show only if supported by the existing data model. Use a multi-select of known schools, not a free-form arbitrary count pretending to associate schools.
- **Save/create:** explicit submit, loading/pending and success/error feedback. The save action must use the existing authenticated Convex mutation.

Keep an unsaved-change warning if the user navigates away while creating/editing. Do not ask for an extra admin passcode. If there is a business requirement for step-up authorization, use the existing secure identity and role model, not a shared secret in the UI.

## 6. Event Feed

Call this **Event feed** or **Manage events** rather than *Live Feed*, because it includes upcoming, live, completed, cancelled, and published events.

### Header and filtering

- Visible total event count if available from real data.
- Search by event title and optionally venue.
- Filter by status and category; optional date range if already supported.
- Sort upcoming soonest first, then latest updated or start date as appropriate.
- No filter should mutate data; search and filters should preserve URL parameters if appropriate.
- Real-time updates via current Convex subscriptions; show existing SSR-safe connection indicator.

### Event item structure

Primary line: event title and status; separate publication badge (`Results published` / `Unpublished` / `Draft`) from event lifecycle status (`Upcoming` / `Live` / `Completed` / `Cancelled`).

Secondary line: category, date/time Asia/Kolkata, venue, participation count only if real data exists, and participating school/teams summary where supported.

Actions (permission-gated and only if existing operations are supported):

- **Edit event**: opens an editor for actual editable fields.
- **Update status**: use allowed state transitions; show confirmation for consequential transitions.
- **Manage results**: opens existing scoring workflow or adapted Publish Winners dialog.
- **View published results**: previews the official public-visible outcome.
- **Archive/delete**: tucked inside More; use confirmation, especially after scoring or publication. Prefer the existing backend's safe deletion constraints.

Avoid exposing icon-only destructive actions beside the primary action. If an event has no results, do not show an empty fictional podium; use `Results not published`.

## 7. Publish Winners dialog: the core interaction

Borrow the placement-oriented dialog in the video, but adapt to Savvy Hunt's verified scorer rules.

### Appearance and structure

- Accessible centered dialog max width ~640–720px, max height `min(85dvh, 860px)`, internal scrolling, sticky footer.
- Heading `Manage event results` or `Publish winners`, event name, category, publication status.
- First/second/third placement groups, each with clear rank label, a school selector, an optional participant/team field **if the backend actually stores it**, point preview from actual scoring policy, and an Add Tie action.
- Multiple entries in the same placement represent a tie. Use a `Remove` control on entries, with the last-row behavior clearly defined.
- Show the official score impact before publication if supported; do not fabricate a preview.
- Bottom actions: `Cancel`, `Save draft` where supported, and `Publish official results` (explicit, possibly confirmation). Do not silently conflate Save with Publish.

### Data model and validation safeguards

1. Load available schools from current school records; no arbitrary typed school string in official score records.
2. Every placement entry must reference the event and existing school ID; participant/team only where supported.
3. Prevent impossible duplicates across placements, unless a documented business rule permits it (e.g. event has independent sub-competitions).
4. Ties share the same placement rank; use competition ranking semantics already adopted in the backend.
5. Point allocations must come from the existing scoring configuration. Never copy the 10/6/2 numbers in the video without verification.
6. Preserve **event-based manual scoring with automatic aggregation**. The winners UI must call the current result/score APIs or adapt their frontend adapter, not create a second scoreboard.
7. Saving or editing published results must not double-award points. Ensure server-side transactional/idempotent update semantics via the existing implementation; add safeguards where missing without rewriting the model.
8. Publication and later revisions are authorized and audited on the backend. Display publication state honestly and never leak drafts publicly.
9. Require confirmation when a published result is being changed in a way that affects public standings.
10. Handle stale data from another organizer: reload, show conflict guidance, prevent overwriting newer published results.

**Crucial mapping:** The video's winner list is a **UI pattern**. If the current Savvy Hunt schema records school points per event but does not record individual participant names, the form must use school selection and rank/points only, not introduce a phantom `participantName` field or falsely imply student-level result tracking. Propose the optional enhancement separately rather than making an undocumented schema migration.

## 8. Example interaction paths

**Create:** Admin opens Events → completes required fields → Create event → authenticated mutation → new item appears in event feed with correct status and no result.

**Update status:** Admin uses event item status menu → picks allowed transition → confirm if needed → mutation → current page and public schedule update through Convex.

**Publish winners:** Admin opens Manage results → current results prepopulate, available schools loaded → adds first/second/third, possibly ties → validate → review actual point impact → publish → official result page and aggregate scoreboard update once.

**Edit published:** Authorized admin opens results → edits affected entries → sees publication/score consequence → confirms → backend replaces or adjusts existing official score records consistently; audit metadata records actor and change.

**Cancel:** Dialog closes without saving; if edited, confirm discarding unsaved changes.

## 9. Mobile and tablet

At widths below ~1024px stack panel and event feed. The Create Event panel may collapse behind `+ Create event` in the page header to prioritize browsing. Use a sheet/drawer only if already in the component library. Event cards become single-column. On small screens use full-screen dialog with sticky actions, large tap targets, and native-friendly select inputs. Never allow cropped Save/Publish buttons or horizontal page overflow.

## 10. Accessibility and usability

- Explicit labels, descriptions and error messages for all fields.
- Keyboard-accessible comboboxes, dialog trap, Escape behavior, focus return on close.
- Status and placement not conveyed by color alone.
- Inline save/publish errors and toast with live-region semantics.
- Disabled buttons accurately reflect pending mutations; prevent duplicate submissions.
- Respect reduced-motion preferences, consistent 44px touch targets on mobile.
- Clear signposting between draft results and public published results.
- No fake `Database Active` badge. Connection indicator should reflect actual existing Convex status.

## 11. Implementation order

1. Audit actual repo routes/components, Convex schema/query/mutation functions, roles and score publication logic.
2. Identify exact status values, categories, result models, tie behavior and point configurations. Write down mismatches between the video and real app.
3. Create the two-column event manager layout with current data; no backend change yet.
4. Refactor the event create/edit form into a compact shared form.
5. Add event feed actions and filters, all wired to existing backend functions.
6. Implement the accessible winners dialog by reusing existing scoring operations. If the model cannot support a part of the reference, maintain existing scoring and explain the gap.
7. Verify auth, permissions, real-time subscriptions, correctness of score aggregation, cancellations, and audited edits.
8. Test production build, TypeScript, lint, existing tests, and desktop/tablet/mobile browser flows. Preserve other admin sections and public pages.

## 12. Acceptance criteria

- [ ] Admin Events page visually reflects a compact create panel + informative event feed.
- [ ] Existing admin menu, Clerk role checks, and Convex auth stay intact.
- [ ] School/category/date fields continue to respect current schema and IST timezone.
- [ ] Event cards distinguish lifecycle status from publication status.
- [ ] Every visible management action is real, permission-checked, and responsive.
- [ ] Winner dialog supports editing all existing official placements and UI-level tied entries where real scoring supports them.
- [ ] A published result updates school-wise/category-wise scores exactly once.
- [ ] Drafts never appear as official published winners.
- [ ] Concurrent organizer edits and duplicate saves are handled safely.
- [ ] Works on 375px mobile, 768px tablet, and wide desktop.
- [ ] No hydration errors, uncontrolled input warnings, or failing production checks introduced.
- [ ] No unapproved fake results/photos, second database, new auth provider, or hard-coded demo school data.

## 13. Copy/paste agent instruction

> Read `design.md`, `ADMIN_EVENTS_VIDEO_REFERENCE.md`, and the two supplied reference screenshots. Inspect the existing Savvy Hunt source tree and map existing event and scoring capabilities before coding. Redesign the current admin Events page to match the reference video's efficient two-column Event Manager and Publish Winners modal while retaining the approved bright sage/ivory aesthetic. Reuse existing Next.js, Tailwind, Clerk, Convex, permissions, manual event-based scoring, aggregation and audit flows. Do not copy the video's hard-coded point scheme, extra passcode, or independent backend. Implement and verify the working page; report any gaps or constraints rather than silently inventing schema fields.
