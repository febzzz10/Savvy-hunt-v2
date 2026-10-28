# Clerk and Convex connection diagnosis

Verified locally on 29 October 2026 against development only. No backend deployment,
schema, scoring logic, credentials or frontend styling was changed for this investigation.

## What the messages establish

The installed Convex SDK is 1.48.0. Its
`src/browser/sync/web_socket_manager.ts` sets a 60,000 ms inactivity watchdog,
resets it on every incoming message (including `Ping`), and reconnects with reason
`InactiveServer` when the watchdog expires. The short `Attempting reconnect` delay
is SDK backoff, not the duration of the preceding outage. A successful WebSocket
handshake alone does not demonstrate restored queries or successful authentication.

The historical Next development log contains both server and browser instances of
these messages. Their confirmed immediate cause is a period with no processed
server messages. Those historical records do **not** establish whether network
loss, a stalled/suspended runtime, or a backend interruption caused the gap. Do not
label repeated timeouts during active use as normal idle behavior: this deployment
sends heartbeats even when scores do not change.

One concrete application defect was present in the version of
`components/connection-status.tsx` inspected initially: calling
`useConvexConnectionState()` during SSR calls `connectionState()`, which lazily
initializes Convex's synchronization client and opens an unnecessary server-side
WebSocket. Merely masking its rendered value until hydration does not prevent that
side effect. This explains unnecessary server connections, but does not prove the
trigger of the historical **browser** heartbeat gap.

The component changed concurrently during this investigation. The current version
uses `useSyncExternalStore`, a constant `connecting` server snapshot, and browser-only
connection/network subscriptions. It avoids that SSR side effect, preserves stable
hydration, and announces connecting, offline, reconnecting and connected states.
Its SSR regression tests were verified. The unsupported `disabled` constructor
option in that test was also corrected concurrently after the initial TypeScript
failure. These existing workspace edits were preserved. The local Next development
server was restarted to discard sockets created by the earlier implementation.

## Configuration findings

- `.env.local` selects `dev:quiet-chickadee-449`. Its public URL and the browser's
  actual WebSocket both use
  `quiet-chickadee-449.ap-southeast-2.convex.cloud`. The read-only Convex CLI log
  stream confirms the same development deployment. No deployment-key override is set.
- `app/providers.tsx` creates one module-scoped `ConvexReactClient`. It is not
  recreated on component rendering. `app/layout.tsx` nests it under `ClerkProvider`
  using the official `ConvexProviderWithClerk` and Clerk `useAuth` integration.
  No duplicate application provider was found. HTTP clients in server routes and
  verification scripts are separate request clients, not duplicate React providers.
- The Clerk publishable/secret key types are both development. The decoded public
  key host, local issuer setting, and the issuer read from the Convex deployment
  all agree. `convex/auth.config.ts` checks audience `convex`.
- Actual authenticated WebSocket messages carried the expected issuer/audience.
  The SDK automatically sent a later-expiring token while the admin page remained
  open. No manual refresh/retry implementation was added.
- Clerk's development-key warning is expected locally. It remains visible. Keeping
  development keys is consistent with
  [Clerk's environment guidance](https://clerk.com/docs/guides/development/managing-environments).
  The provider arrangement and automatic token renewal follow the
  [official Convex Clerk integration](https://docs.convex.dev/auth/clerk).

## Verification and evidence

An active, populated scoreboard was observed for 150 seconds: one Convex WebSocket,
ten `Ping` messages approximately 15 seconds apart, no reconnects, no page errors,
and the expected Clerk development warning. This exceeds two inactivity windows;
it is a bounded observation, not a production stability guarantee. Sanitized local
evidence is in ignored `verification-evidence/connection-baseline.json`.

`node scripts/verify-connections.mjs` uses two isolated anonymous Edge contexts plus
an authenticated staff context on localhost, guarded against production targets.
It reuses an existing unpublished development verification fixture, temporarily
publishes/corrects its scores and changes its venue, then revokes the publication
and restores the venue. Audit history and revoked revisions are retained.

Checks performed:

- Homepage, overall school standings, category standings, schedule and event detail
  load in both anonymous sessions.
- Real development Clerk authentication grants access to the protected admin page;
  the anonymous session is refused access. The normal login form also loads.
- Publication updates overall/category standings, event results and home leaders in
  both sessions without reload.
- An intentional socket close while online produces the reconnecting message and
  recovers using Convex's built-in reconnect behavior.
- A browser context is taken offline and its existing sockets explicitly closed,
  ensuring this tests a real interruption rather than just the browser online flag.
  It shows the offline warning and retains old scores while the other context
  receives new scores and venue information.
- On recovery, all five views receive the values changed during the outage without
  navigation/reload. Both connection status and actual data recovery are asserted.
- Outgoing authentication frames show automatic token renewal with a later expiry;
  protected admin access still works afterward. Only issuer/audience/timestamps are
  recorded, never tokens or keys.

The script also checks that navigation between the scoreboard and schedule retains
the existing WebSocket. Results are saved in ignored
`verification-evidence/connections.json`. Browser instrumentation exists only in
the verification script, not in application code. No logger suppression, replacement
retry loop or loss of reactive subscriptions was introduced.

The complete script passed again after the development-server restart: ten checks,
no page errors, successful fixture cleanup, and no server-side reconnect/error
entries in the fresh development log during the check.

| Command | Result |
| --- | --- |
| `npx tsc --noEmit` | Passed after the existing test option correction |
| `npm run lint` | Exit 0, including TypeScript; latest run reports one unrelated unused-import warning in `lib/drive-server.ts` |
| `npm test` | Latest run: 8 files, 41 tests passed, including 3 SSR status cases |
| `npm run build` | Passed on the latest workspace snapshot; all 20 static pages generated |

Available function logs were inspected with the read-only CLI against development.
They do not provide WebSocket-level history explaining the original heartbeat gap.
Existing unrelated gallery diagnostics were not treated as proof of an auth or
transport failure. Production log access and production behavior were not tested.

## Before production deployment

Keep `.env.local` on development credentials. Configure production separately,
following [Clerk's production guide](https://clerk.com/docs/guides/development/deployment/production)
and the existing [deployment runbook](../PRODUCTION_DEPLOYMENT.md):

1. Create/select the production Clerk instance; configure and verify its custom
   domain/DNS, HTTPS, sign-in/sign-out redirects and authorized origins. Configure
   production OAuth credentials, email delivery and the chosen staff/MFA policy.
2. In production hosting only, configure the matching production Clerk publishable
   key and server-only secret key. Never expose the secret through `NEXT_PUBLIC_`
   variables, logs, build output or reports. Do not reuse these keys on localhost.
3. Configure the production Clerk Convex integration or `convex` JWT template with
   audience `convex`. Set `CLERK_JWT_ISSUER_DOMAIN` on the **production Convex
   deployment** to that instance's issuer, not its JWKS URL. Synchronize auth config
   through the authorized production release procedure.
4. Build the production frontend with the matching production Convex URL. Local
   `.env.local` settings do not prove hosting configuration. Rebuild after changing
   public build-time variables.
5. Enroll intended production admin identities through the existing allowlist flow;
   development user IDs/issuer-scoped identities do not transfer automatically.
   Rehearse production sign-in, renewal, sign-out, revoked access, two-session score
   publication and interrupted-network recovery on real staff/spectator devices.
6. Complete the independent release gates in the deployment runbook, including the
   existing Drive access/media checks. This task did not resolve those blockers.

If `InactiveServer` recurs while actively using the current build, capture UTC wall
times, whether the device/tab was suspended, WebSocket frame gaps/close reasons and
deployment health at the same time. That evidence is still needed to attribute the
historical browser timeout to a specific external cause; no such cause is claimed
as fixed by this report.
