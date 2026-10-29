# Event category editing fix

## Root cause

The form initialized its category from `event.categoryId` and submitted that selected ID to `events:save`. No automatic replacement with the first category was found. The backend's error specifically required the submitted ID to differ from the stored ID and a published, superseded, or revoked result revision to exist.

The frontend treated the absence of `activePublishedRevisionId` as unpublished and kept the category editable. Revocation clears that pointer and sets `resultStatus` to `none` (or `draft` if a draft remains), while preserving historical revisions. That made previously published events look like never-published events. Their backend category restriction was correct.

## Changes

- `convex/events.ts`: derives authenticated admin publication metadata from revision history; shares the historical category guard between query and mutation; adds optional expected-category/update checks to reject stale saves; permits retaining an inactive original category during other edits. Creation and category changes still require an active category. Authorization, publication restrictions, participating-school validation, and auditing remain enforced.
- `components/admin/events/event-form.tsx`: keeps a stable form snapshot, displays and locks the original category for historical events, includes the explanation, retains a missing original category option, and supplies stale-edit checks on save.
- `components/admin/events/shared.tsx`: uses the actual admin-query type and displays distinct Unpublished, Draft, Published, and Revoked badges. A private draft may appear alongside Published or Revoked.
- `app/admin/events/page.tsx`: displays historical publication status and sends concurrency checks for status changes.
- `components/admin/events/winners-dialog.tsx`: displays revoked history correctly in the existing dialog.
- `lib/results-editor.ts`: explains category/history errors, handles stale event errors, reads structured Convex errors, and suppresses unknown server stack traces.
- `convex/events.test.ts`, `tests/event-form.test.tsx`, `tests/results-editor.test.ts`: backend, form/status, and readable-error regressions.
- `scripts/verify-event-manager.mjs`: adds real-data checks for original-category initialization, category locks, and enabled detail editing. It does not save event or result records.

No schema migration, scoring calculation, historical result deletion, authentication change, or design/color change was needed.

## Verification

TypeScript, lint, production build, and the full test suite passed. Backend tests cover creation, unchanged categories, category changes before publication, drafts, each protected historical revision state, revoked drafts, other detail edits, stale-category writes, inactive original categories, school/category totals, and preserved revisions/audit records. UI tests cover exact category initialization, reordered/missing options, category locks, stale data, publication badges, and readable errors.

The existing development Convex deployment (`quiet-chickadee-449`) accepted the updated functions. Production was not deployed.

Browser checks passed at 320, 375, 768, 1024, and 1440px, with no page errors, overflow, or automated WCAG A/AA violations. Historical category locks, search/reset, tied winner controls, validation, discard confirmation, focus containment, Escape, and focus restoration passed. The development dataset contained published and revoked events; never-published and draft-only cases were verified in isolated tests.

Evidence: `verification-evidence/event-manager/report.json` and screenshots in the same directory. No remaining implementation issues were found.
