# Savvy Hunt: persistent project memory

Repository baseline reviewed 2026-11-02. This file records evidence and context; [agent.md](agent.md) contains working rules. Source takes precedence over outdated reports. Runtime configuration, live data and production state were not inspected in this documentation task.

## 1. Project identity

The package and public product are **Savvy Hunt**, a school competition platform. Spectators/schools use the public programme, official results, live standings and approved snapshots; organizers use the admin workspace. Correct published scores, timely updates and controlled media publication are central objectives. The repository contains a working implementation and extensive development verification reports, with production acceptance still unverified.

## 2. Current project state

Implemented routes include `/`, `/scoreboard`, `/scoreboard/[slug]`, `/schedule`, `/events/[slug]`, `/results`, `/snapshots` and `/about`. Public pages subscribe to the current Convex edition. Homepage includes hero, live/next/result summaries, leading schools, event updates, recent achievement cards, announcements and approved snapshots with honest loading/empty states.

Admin routes include overview, schools, events, per-event result editor, scoreboard contribution drilldown, announcements, gallery, settings, admins, audit, login, setup and request-access. Schools support archive/restore; events support schedule/status/participation edits; results support drafts, previews, publication, correction and revocation. Gallery supports sync, pending/approved/rejected review, private preview, explicit consent, metadata, ordering and hide.

Not implemented as current workflows: website photo uploads, runtime Google OAuth writes, public admin self-enrollment or an ordinary browser first-admin bootstrap. `galleryUploads` persists only for historical records. No separate `hooks/` directory, Server Actions business layer, custom Next configuration, Vercel configuration file or CI workflow was found. Deployment procedure is documentation/manual configuration.

Unresolved externally: actual production deployment/domain, official event content and scoring policy acceptance, staff MFA/recovery policy, credential rotation, sustained hosting/media capacity and full assistive-technology acceptance. No active task backlog or user-approved next priority can be inferred from old plans.

## 3. Architecture memory

- Next App Router/React strict TypeScript frontend; lockfile versions are recorded in agent.md. Root `app/layout.tsx` installs Clerk, fonts, Convex provider and footer. `proxy.ts` initializes Clerk middleware without an explicit route-protect call.
- `app/providers.tsx` creates one module-level ConvexReactClient and uses ConvexProviderWithClerk. Most live route content uses client hooks; `components/data.tsx` supplies current-edition loading and string-reference helpers alongside newer generated API references.
- Convex owns persistent data and business transactions. Indexed queries feed reactive subscriptions, with no separate scoreboard polling/state store. Result mutations atomically update revisions, aggregate totals, official event pointers and audit records.
- Clerk authentication is separate from admin authorization. The complete issuer-scoped tokenIdentifier is the allowlist key. UI access gates supplement backend `requireAdmin` checks.
- Google Drive holds image bytes; Convex holds review metadata. Convex cron/actions import and reconcile read-only Drive state, while a Next Node route securely serves verified bytes. Gallery actions use internal mutations to recheck review state across external-I/O boundaries.
- Vercel is the documented frontend hosting target with a separately deployed Convex backend and separate preview/production Clerk/Convex credentials. Reports establish development work, not current production state. Reasons for original framework/provider choices are not documented and are not inferred here.

## 4. Product decisions

- Edition initialization creates Category I, II, III, IV, V and Common Category, with `Asia/Kolkata` timezone. One current edition is resolved via `isCurrent`; no full edition lifecycle UI is established by initialization alone (`convex/editions.ts`).
- Schools earn manually entered nonnegative integer points; there is no encoded automatic placement-to-points schedule. Overall standings sum category totals including Common once. Active schools only are publicly ranked; equal totals share competition rank and names break display-order ties (`convex/lib/scoring.ts`, `convex/scoreboard.ts`).
- Event status (upcoming/live/completed/postponed/cancelled) is organizer-controlled and distinct from result publication. Schedule uses event timestamps; public availability is not inferred from the clock.
- Official results are versioned publications. Draft corrections coexist with the official revision. Corrections require reasons when replacing an active publication; revocation retains publication history.
- Explicit placements drive achievement winners, including tied placements and zero-point placed entries. Names are public only when `namePublishingApproved` is true; the current draft mutation accepts school/points/placement/entryLabel, not participant names.
- Gallery publication requires a real moderator consent decision; syncing is not approval. Photos are uploaded by organizers directly to Drive. Separate incoming folders require manual movement into the gallery folder before approval.
- Editors handle ordinary operational editing/media moderation; super admins control official result publication, settings, admin roles, edition initialization and audit access. Signing in does not grant organizer access.

## 5. UI/UX memory

Current foundation: ivory canvas, sage surfaces, green actions, restrained terracotta/gold details, Fraunces headings and DM Sans body. Exact tokens live in `app/globals.css`; shared custom controls/icons live in `components/ui.tsx`. The nature redesign supersedes the cobalt/Archivo direction in `docs/editorial-redesign.md`. The supplied design handoff and earlier root design documents are historical references, not stronger authority than current source.

Current presentation includes responsive shared navigation, mobile navigation/updates, illustrated hero, school podium and achievement cards. Styles are split across shared CSS and feature CSS under `components/home/`, admin events and schools. Public snapshots use a native dialog lightbox with keyboard/focus handling. Visible focus, skip links, reduced motion, loading skeletons and genuine empty states are established patterns. Recent Git history records further header, mobile hero/navigation and achievement refinements on 2026-11-01; it does not independently prove user approval of every design detail.

## 6. Backend memory

| Entities | Relationships and role |
|---|---|
| editions, categories, schools | Edition-scoped competition configuration and roster; schools archive rather than disappear from history |
| events | Edition/category, optional participating schools, schedule/status and active published revision pointer |
| resultRevisions, resultEntries | Event revision history and ordered school point/placement rows; repeated schools supported |
| schoolCategoryTotals | Materialized edition/school/category scores changed by publication deltas |
| galleryItems, gallerySyncState | Drive identity/checksums, moderation/consent/version and synchronization lifecycle |
| galleryUploads | Retained historical upload intents; no current upload writers |
| announcements, siteSettings | Published/draft/hidden messages and editable public title/about/contact content |
| admins, adminBootstrapState | Active issuer-scoped role allowlist and durable one-time provisioning marker |
| auditLogs | Actor/action/entity/time and optional reason/before/after; actual fields populated vary by operation |

Key backend behaviors:

- `results.saveDraft`: validates at most 200 entries, safe integer points/placements, edition and participation; checks expected version when replacing a draft. Previously official archived schools can remain in corrections. Public queries do not expose drafts.
- `results.preview`: supplies active revision/draft expectations and per-school deltas. `publish` rejects stale revisions/drafts and empty results, returns already_published/unchanged where appropriate, updates totals transactionally and supersedes the previous revision. `revoke` subtracts contributions, marks the revision revoked, removes the active pointer and audits a mandatory reason.
- `events.save`: validates timestamps, length limits, slug uniqueness, category/school edition and active participation. Historical publication permanently locks category. Optional expected category/update timestamps protect current form submissions; these checks are not universally mandatory API arguments.
- `schools.save`: validates names/codes, uppercases codes and enforces edition-local uniqueness. Archiving affects public standings without deleting official entries.
- `admins.bootstrap`: internal owner-only first admin, closed by any existing admin/bootstrap marker. `sealBootstrap` closes legacy installations without granting access. `admins.save` prevents removing the caller's own super-admin privileges. Audit pagination is super-admin-only.
- `announcements.save` returns content to draft; `setStatus` explicitly publishes/hides. `siteSettings.update` requires super admin.
- Gallery cron runs every two minutes. Sync uses run state, paginated Drive reads, scheduled continuations and reconciliation. New files become pending; changed/missing/moved files lose verification/consent as appropriate. Approval checks reviewed version/checksum, approved-folder presence and duplicate approved entries, then internally rechecks authorization/state.
- The image GET route checks approved metadata (or authenticated admin preview), folder/type/size, metadata checksum, downloaded-byte checksum and final public approval state. Success uses private/no-store, nosniff and sandbox headers. Invalid/withdrawn media is refused rather than served from an unchecked Drive URL.

Schema indexes and exact validators remain authoritative in `convex/schema.ts`; generated bindings are checked in and CLI-owned. `.env.example` lists configuration names only. Drive settings/proxy secret must agree between Next server and Convex; Clerk issuer belongs in Convex. No secret values are recorded here.

## 7. Past problems and resolutions

| Confirmed issue | Established cause and resolution | Status/evidence and regression risk |
|---|---|---|
| Connection status SSR/hydration and unnecessary server sockets | Reading the live Convex connection hook during SSR could initialize a socket and differ from browser markup; changed to browser subscriptions with stable `useSyncExternalStore` server snapshot | Implemented in `components/connection-status.tsx`, covered by `tests/connection-status.test.tsx`; `HYDRATION_FIX_REPORT.md` and `docs/connection-diagnosis.md`. Historical browser heartbeat gaps still lack an established network/backend root cause |
| Revoked events appeared category-editable | UI used absence of active pointer while backend retained publication history; admin query/form now use full history and lock original category, with stale-event checks/readable errors | `docs/event-category-editing-fix.md`, `convex/events.ts`, `components/admin/events/event-form.tsx`, backend/form/result-error tests. Revoke must never unlock historical categories |
| Drive folder previously returned 404 | Later read-only preflight found access restored; report explicitly cannot establish which external configuration/sharing change restored it | `docs/gallery-drive-only-report.md` dated 2026-10-29 supersedes older access-blocker claims. Current external access not rechecked here |
| Website upload/OAuth complexity | Workflow was changed to manual Drive uploads and read-only service-account sync; legacy records retained | Current routes/helpers/schema and Drive-only report confirm removal. Do not resurrect writes from obsolete deployment prose |
| Clerk secret previously exposed in example configuration | Reports state removal from source, but removal does not revoke a credential | README and `PHASE4_RELEASE_REPORT.md` still require owner rotation; completion unverified. No credential value was inspected or reproduced |

## 8. Known issues and technical debt

- Documentation drift is confirmed: production/Phase 4 documents mention an old Drive blocker and upload/OAuth paths; current code and Drive-only report supersede those details. Historical test counts are snapshots, not today's suite count.
- Multiple backend queries collect whole edition/event ranges; scoreboard computes totals with in-memory filtering and recent publication query scans edition events before limiting hydration. Growth beyond rehearsal datasets needs profiling/pagination/index review; no current capacity failure is claimed.
- String-based manually typed API references coexist with generated references, adding contract-drift risk. Older compact formatting is inconsistent with newer expanded modules.
- Deployment evidence is incomplete. No committed CI pipeline enforces checks. Google font build downloads can require network. Production permissions, quota/billing, backups/restore and official staff/device rehearsal need environment-specific evidence.
- The dated Phase 4 short test used 500 development socket clients, not 500 rendered production browsers; reported worst update latency exceeded nine seconds. It does not certify sustained event-day or image capacity.
- Real public approved-photo delivery was not exercised in the Drive-only report because consent was not established for the available photo; automated approval/proxy tests do not prove production acceptance.
- Manual screen-reader, real-device and staff mailbox/MFA recovery acceptance remain unverified. No source TODO/FIXME backlog was found in app/components/convex/lib during this review; absence of markers does not establish absence of bugs.

## 9. Important files and dependencies

| Area | Files | Purpose |
|---|---|---|
| Auth | `app/providers.tsx`, `proxy.ts`, `convex/auth.config.ts`, `convex/lib/security.ts`, `app/admin/layout.tsx` | JWT transport, UI access and backend authorization |
| Provisioning | `convex/admins.ts`, `docs/admin-setup.md` | Allowlist, bootstrap, roles and audit |
| Scores/results | `convex/results.ts`, `convex/scoreboard.ts`, `convex/lib/scoring.ts`, `lib/results-editor.ts`, `app/admin/events/[id]/results/page.tsx` | Draft/publication/delta/revoke workflows and error presentation |
| Events/schools | `convex/events.ts`, `convex/schools.ts`, `components/admin/events/event-form.tsx`, `lib/school-manager.ts` | Lifecycle guards and management |
| Home | `components/home.tsx`, `components/home/`, `lib/achievement-results.ts` | Live summaries, podium, hero and achievement mapping |
| Gallery | `convex/gallery.ts`, `convex/gallerySync.ts`, `convex/gallerySyncData.ts`, `convex/crons.ts` | Moderation, scheduled import and reconciliation |
| Media delivery | `lib/drive-server.ts`, `lib/drive-validation.ts`, `app/api/gallery/[itemId]/image/route.ts` | Read-only service-account requests and checked proxy |
| Foundation | `app/globals.css`, `app/layout.tsx`, `components/ui.tsx`, `components/site-navigation.tsx` | Current tokens, fonts and shared components |
| Verification | `vitest.config.ts`, `tests/`, `convex/*.test.ts`, `scripts/` | Isolated tests and explicit development/browser checks |
| Release | `.env.example`, `README.md`, `PRODUCTION_DEPLOYMENT.md`, `PHASE4_RELEASE_REPORT.md` | Configuration and operational procedures with historical caveats |

Dependency/configuration authority: `package.json`, `package-lock.json`, `tsconfig.json`, `eslint.config.mjs`, `postcss.config.mjs`. Available commands and safe execution workflow are in agent.md.

## 10. Development progress

Implemented milestones visible in source/reports: public/admin competition lifecycle; transactional result correction/revocation; Drive-only gallery; secured owner bootstrap and allowlist; SSR-safe connection indicator; nature redesign; event-history/category fixes; responsive navigation and achievement/mobile updates. Git's latest reviewed entries on 2026-11-01 concern header and achievement/mobile presentation.

Earlier `prd.md`, `plan.md`, `architectur.md`, `database.md`, `appflow.md`, `techspc.md` and design handoff capture intent/history; they are not an active backlog or proof of current behavior. Next operational work depends on organizer content/policy approval and separately authorized production configuration, security rotation, backup/recovery and rehearsal. No production or data mutation was performed for these two documents.

## 11. Durable constraints

Official data must remain reconcilable from active published revisions and retained history. Draft edits must not leak into standings. Backend role checks and edition boundaries remain security boundaries; UI hiding alone is insufficient. Consent is tied to reviewed image bytes, not merely a Drive file ID. Reactive public views, honest connectivity/loading states, responsive layouts and the current visual identity must survive changes. Development fixture scripts and deployment commands can mutate external state; local successful tests do not imply safe production operation.

## 12. Decisions and changes log

Dates below come from dated reports, inspected Git history or this documentation task; historical verification is reported evidence, not rerun here.

| Date | Decision or change | Reason | Status | Evidence |
|---|---|---|---|---|
| 2026-10-29 | Drive-only, service-account read-only gallery | Manual Drive upload workflow with moderated publication | Implemented; production acceptance unverified | `docs/gallery-drive-only-report.md`, current gallery/Drive source |
| 2026-10-29 | Stable SSR connection snapshot and browser-only subscriptions | Avoid hydration divergence and SSR socket side effect | Implemented with regression coverage | `HYDRATION_FIX_REPORT.md`, `tests/connection-status.test.tsx` |
| 2026-10-29 | Nature-inspired visual foundation | Documented redesign direction | Implemented; later refinements present | `docs/nature-redesign.md`, `app/globals.css`, `app/layout.tsx` |
| 2026-11-01 | Responsive header, mobile hero/navigation and achievement refinements | Commit subjects describe presentation improvements; further rationale not inferred | Present in reviewed Git history/source | `git log`, `components/site-navigation.tsx`, `components/home/` |
| 2026-11-02 | Separate engineering guidance and persistent evidence memory | Requested agent onboarding and durable project context | Documentation created; no app behavior change | `agent.md`, `memory.md` |

## Memory maintenance policy

Update after significant verified architecture, schema, auth, feature, critical bug, deployment, UI decision or constraint changes. Skip trivial edits unless they establish a durable fact.

Read the existing section first, verify source/evidence, replace obsolete facts, retain useful historical context and add one concise dated log entry only when warranted. Avoid duplicate entries and contradictory layers. Separate confirmed facts, historical reports and unresolved questions. Never record secrets or claim undocumented preferences are approved decisions. Keep this a searchable context record rather than an activity diary; commands and operating rules belong in agent.md. When runtime evidence is unavailable, explicitly retain that uncertainty.
