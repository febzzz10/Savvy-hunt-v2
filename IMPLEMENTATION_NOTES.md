# Savvy Hunt implementation notes

## Reconciliation

- The workspace initially contained specifications only. The referenced repository is described in `plan.md` as static HTML backed partly by Supabase; its scripts are not suitable for the required Convex source of truth. The remote GitHub page could not be fetched in the initial implementation session.
- `database.md` is the canonical table and scoring contract. `appflow.md` fixes editor versus super admin publication permissions. The handoff proposes Clerk; use Clerk identity with a Convex allowlist. Clerk configuration and first admin identity are organizer supplied.
- Nonnegative integer points, Asia/Kolkata display, and curated existing Drive files are working defaults. Official scoring policy, admin roster, Drive access, media consent procedure, and event details remain open. No official scores or events are seeded.
- Published revisions remain immutable. One active revision pointer per event is authoritative. Materialized totals are updated by deltas in the same Convex mutation. Ties use competition rank.
- `announcements` is an added table because the original canonical schema has no multi-announcement model, while the current product request explicitly requires create, edit, publish, and remove. Hiding is the removal operation so audit history remains intact.
- `events.participatingSchoolIds` is optional. Omitted or empty means all active schools can enter; a nonempty list limits draft rows to assigned schools. This preserves events created before the field existed. Published result schools cannot be removed through routine event editing.
- `resultRevisions.draftVersion` is an optional optimistic concurrency counter. Existing drafts without it use version 0. Save and publish reject stale versions.
- Drive approval is implemented as a Convex action that verifies the service-account-accessible file before an internal mutation marks it approved. The public image route rechecks both Convex approval and Drive metadata. A shared server-only `GALLERY_PROXY_SECRET` restricts access to the file ID lookup query.

## Ordered checklist

- [x] Read six specifications and inspect local workspace.
- [x] Install dependencies and resolve npm audit findings.
- [x] Generate Convex bindings against development `quiet-chickadee-449`.
- [x] Configure Clerk JWT template/issuer and verify real development authentication.
- [x] Verify core management, scoring, audit, roles, and concurrency with integration and live tests.
- [x] Demonstrate public subscriptions across separate anonymous browsers, including reconnection.
- [ ] Configure approved Drive media delivery.
- [x] Run local unit, integration, browser, security, and production-build checks.
- [ ] Complete real approved-Drive delivery and production infrastructure rehearsal.

## Current blockers

Phase 3 connected development Convex and Clerk, generated bindings, fixed the JWT issuer/template, and passed full lint, tests, build, and live browser scoring checks. Gallery editing/reordering and gallery/audit pagination are implemented. `FINAL_VERIFICATION_REPORT.md` records evidence and exact limits.

Phase 4 found the service-account/folder/proxy configuration present and matching locally and in development Convex. Google token exchange returns 200, but the configured folder returns 404 and lists no accessible files. Positive image approval/delivery and real changed/unavailable-photo scenarios remain blocked by folder access and missing consent-cleared fixtures. See `PHASE4_RELEASE_REPORT.md` for current evidence and `PRODUCTION_DEPLOYMENT.md` for deployment instructions.

Normal password sign-in, new-device test email verification, sign-out and password recovery now pass with a temporary real Clerk development user. A short rehearsal passed with 500 live Convex clients and 2,000 subscriptions, including 50 forced reconnects; this is not production hosting/media capacity evidence. Frontend fixes add current-page navigation, keyboard skip links, readable sign-in attribution, wrapped identity keys, role messages, sign-out and hydration-safe offline/reconnect status. Scoring transactions and backend authorization remain authoritative.

Concurrent gallery upload/sync work appeared in this workspace during verification. It includes additional optional gallery metadata/tables and must be reviewed as part of the complete release diff; the Phase 4 frontend changes did not require a scoring or database redesign. Existing-draft saves still require the matching version; revocations require the expected active revision; category edits remain blocked after official result history. Real staff MFA/OAuth and mailbox recovery, manual assistive-technology checks, credential rotation and organizer policy approval remain launch work. Do not treat development verification as production approval.
