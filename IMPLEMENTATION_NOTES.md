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
- [ ] Generate Convex bindings (requires development project login).
- [ ] Configure Clerk, Convex deployment, and first admin.
- [ ] Implement and verify schema, management, scoring, and audit.
- [ ] Connect public and admin pages through reactive queries.
- [ ] Configure approved Drive media delivery.
- [ ] Run unit, integration, browser, security, and deployment checks.

## Current blockers

Package installation now works. Convex deployment credentials, Clerk keys, and school-owned Google Drive credentials are unavailable in this workspace. The Convex CLI cannot generate bindings without a configured project. No live sign-in, mutation, image delivery, or cross-browser update may be claimed verified without them.

The current source is still an unverified MVP. The new gallery action checks Drive metadata before approval, but no real Drive service account has exercised it. School/event editing, announcements, content settings, filters, and previews exist in source. Backend integration, role security, real-time, browser, accessibility, and load tests remain. Do not deploy as production ready.
