# Savvy Hunt hydration verification

Date: 29 October 2026. Runtime changes are confined to `components/connection-status.tsx`.

## Root cause and baseline

The reported trace describes a component rendering `useConvexConnectionState()` directly.
The installed Convex hook reads `client.connectionState()` during rendering through its
subscription helper. `app/providers.tsx` retains a shared module-level Convex client,
so its server-side state can differ from a newly created browser connection. Rendering
those different states as text and CSS classes produces different hydration markup.
`Nav` includes this component on each affected route, spreading the same problem.

The checked-out component already contained a hydration guard from Phase 4. Baseline
browser checks on `/`, `/scoreboard` and `/schedule` did not reproduce the reported
mismatch with that guarded source. However, the Convex hook still read live connection
state during SSR. The new regression tests demonstrated that read in all three cases:
never connected, connected, and previously connected but disconnected.

## Solution

Replaced the separate hydration/network guards and `useConvexConnectionState()` with
one `useSyncExternalStore` subscription around the existing Convex client:

- `getServerSnapshot()` always returns the primitive string `"connecting"`.
- React uses that same snapshot for SSR and the initial hydration render. Both emit
  `connection-status disconnected` and `Connecting to live updates…`.
- After hydration, `getSnapshot()` reads actual browser network state and the existing
  client's `isWebSocketConnected` / `hasEverConnected` values.
- The subscription listens to Convex connection changes and browser online/offline
  events, and removes all listeners on cleanup.
- Primitive snapshot values remain stable when unrelated connection metrics change.
- SSR no longer reads connection state or browser globals through this component.

Connecting, connected, reconnecting and offline messages remain live and accurate.
No polling, artificial post-hydration connectivity, `suppressHydrationWarning`,
page-wide client-only rendering, dependencies, provider replacement or database
changes were introduced. This follows React's documented
[server snapshot contract](https://react.dev/reference/react/useSyncExternalStore).

## Files changed for this task

| File | Change |
|---|---|
| `components/connection-status.tsx` | Explicit SSR-safe external store; real Convex/network subscription and cleanup |
| `tests/connection-status.test.tsx` | Three server-render regression cases; identical markup and no live-state/browser-global reads |
| `scripts/verify-hydration.mjs` | Repeatable real-browser fresh-load, navigation, socket-reconnect, offline and optional live-subscription checks |
| `HYDRATION_FIX_REPORT.md` | This report |

Pre-existing staged and unstaged project changes were preserved. No changes were
needed in `components/public.tsx`, the providers, Clerk middleware or Convex backend.

## Related hydration review

Reviewed shared navigation, public/home components, providers, root layout and relevant
admin rendering for random/time-based output, browser globals, initial state, locale
formatting and nesting.

- No `Math.random()` or `Date.now()` render calls were found in application components.
- Public schedule/result dates specify locale and `Asia/Kolkata`. Their data comes from
  client subscriptions rather than differing server/browser date snapshots.
- Some admin date displays use the browser's locale, but render after subscribed data
  arrives. The private setup form also initializes the current year behind authentication.
  No related mismatch was demonstrated; these unrelated displays were left unchanged.
- Network globals are now read only in the external store's browser snapshot and
  subscription lifecycle. No confirmed additional nesting or navigation mismatch was found.

## Verification actually performed

| Command | Result |
|---|---|
| `npx vitest run tests/connection-status.test.tsx` before runtime change | **3 failures**, each proving SSR read the live connection state |
| Same targeted command after fix | **3 passed** |
| `npx tsc --noEmit` | **Passed**, exit 0 |
| `npm run lint` | **Passed**, exit 0; ESLint and full TypeScript |
| `npm test` | **Passed**, exit 0: **8 files, 45 tests** |
| `npm run build` | **Passed**, exit 0; compilation, TypeScript, page generation and optimization |
| `node scripts/verify-hydration.mjs --live` | **Passed**, exit 0: **9 browser checks** against the existing development server |
| `$env:VERIFY_BASE_URL='http://localhost:3101'; node scripts/verify-hydration.mjs` | **Passed**, exit 0: **8 browser checks** against `next start -p 3101` serving the optimized build |

An initial test-fixture constructor option was unsupported by the installed Convex
types. It was removed, then TypeScript, lint, the full test suite and build were rerun
successfully. Type checking was not disabled.

Browser: actual headless Microsoft Edge, isolated context. Verified:

1. Fresh `/`, `/scoreboard` and `/schedule` responses contain the exact same connecting
   server markup; all hydrate and reach a real connected state.
2. Navigation to each route uses Next links and preserves a document marker, proving
   client-side navigation rather than full-page reloads.
3. Closing the actual Convex transport records connected → reconnecting → connected.
4. Browser offline/online transitions show the correct status and recover without refresh.
5. A temporary labeled development announcement is published and hidden while the
   homepage remains open; its subscription updates without refreshing. The announcement
   was hidden and the temporary verification session revoked afterward. Official scores
   and existing school/event data were not edited for this task.

Both browser runs recorded **zero page exceptions and zero hydration/React console
errors**. The final optimized-build evidence is in ignored
`verification-evidence/hydration.json`. The full suite also continues to pass scoring,
authorization, gallery and server-route tests; those tests are not a new live Drive rehearsal.

## Remaining warnings and deployment settings

- `/favicon.ico` returns 404. Its console message was confirmed separately and is
  unrelated to hydration; adding branding assets is outside this fix.
- Both configured Clerk key modes are development/test. The development-key warning
  remains expected even when an optimized Next build uses those keys. Clerk was not
  disabled, and keys were not replaced or exposed.
- For a future authorized production deployment, configure matching production
  `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and server-only `CLERK_SECRET_KEY`, complete Clerk's
  production domain/DNS and redirect configuration, and configure the production
  Convex issuer plus the `convex` JWT template/audience. Point the frontend at that
  production Convex deployment. See the
  [Clerk production guide](https://clerk.com/docs/guides/development/deployment/production).

No persistent connection failure was observed in these checks. No production
deployment or environment change was performed. Broader launch blockers documented
in `PHASE4_RELEASE_REPORT.md` are outside this hydration fix.
