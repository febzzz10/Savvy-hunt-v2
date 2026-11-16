# Event manager redesign

The Events route now uses a compact create/edit panel beside a continuous event feed, keeping Savvy Hunt's ivory, sage, and green tokens. Below 1024px the form and feed stack; the winners dialog fills small screens and keeps its actions visible while its body scrolls.

## Existing contracts retained

- Clerk and the existing admin shell remain unchanged. Editors save drafts; only super admins publish, correct, or revoke results.
- Event fields and status values use `events:save`; the feed uses live Convex subscriptions. Search, status, category, IST date, and sorting are read-only filters.
- First, second, third, and tied placements use existing school IDs, manual points, placement, and optional entry labels. Other placements and participation entries remain editable. No fixed point awards were introduced.
- Saving drafts and publishing remain separate. The dialog shows the existing backend score preview and sends draft-version and active-revision guards when publishing. Existing transactional delta aggregation and audit history remain untouched.
- Incoming result updates do not reset unsaved inputs: the editor blocks further writes and offers an explicit reload. Duplicate submissions are disabled. Published corrections require a reason and confirmation.
- Existing multi-entry school results remain editable; newly introduced duplicate school selections are rejected.
- No event deletion operation exists in the backend, so none is exposed. The existing standalone results route remains available and unchanged by this work.

## Verification

- TypeScript, ESLint, production build, and 76 tests passed (15 test files).
- Added an isolated Convex test covering tied placements, draft isolation, duplicate publication, and correction totals. Its numeric values are test fixtures, not scoring policy.
- `scripts/verify-event-manager.mjs` uses an existing development verification identity and does not write event/result records. It verifies real subscribed data, filters, tied rows, validation, discard handling, keyboard containment, Escape, and focus return.
- Browser checks passed at 320, 375, 768, 1024, and 1440px; dialog checks passed at 375, 768, and 1440px. No page errors, horizontal page overflow, or automated WCAG A/AA violations were found.
- Screenshots and the browser report are in `verification-evidence/event-manager/`. Clerk connectivity required the final browser run to use `node --dns-result-order=ipv4first scripts/verify-event-manager.mjs`.

## Reference limitation

Both design documents were read. The named `event-manager-reference.jpg` and `publish-winners-reference.jpg` files were absent from the workspace and Desktop search results. Implementation follows the detailed video adaptation document; direct comparison with those frames was not possible.
