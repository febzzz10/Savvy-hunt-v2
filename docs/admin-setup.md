# Admin account setup

Clerk sign-in authenticates a user; it does not approve that user as an admin.
Convex checks the `admins` table using the full `ctx.auth.getUserIdentity()`
`tokenIdentifier`. The row must have `isActive: true`; access management, audit
history, and edition initialization also require `role: "super_admin"`.

Copy the entire key shown at `/admin/request-access`, including the issuer URL,
the `|` separator, and the Clerk subject. An email address, a bare `user_...` ID,
or an identity from a different Clerk instance will not match. Do not infer the
key from an email or manually shorten it.

## Current development installation

Inspection on 29 October 2026 of **dev `quiet-chickadee-449`** found 18 allowlist
rows: one active `Verification Super Admin` and 17 revoked entries. Initial setup
had already happened. During this fix the account in the already-open signed-in
request-access tab was explicitly granted `super_admin` through the existing
`admins:save` mutation. Its Clerk display name is `Ggg Uuu`. The installation's
bootstrap is also sealed with a persistent completion record. Do not delete
existing entries to reopen bootstrap.

### Approve an account when a super admin already exists

Preferred UI workflow:

1. The intended admin signs in and copies their key from `/admin/request-access`.
2. An existing active super admin signs in to `/admin/admins` and supplies that
   complete key, a display name, and the intended role. Select **Super admin**
   only for the organizer who should manage access and publication.
3. Select **Grant access**. The existing `admins:save` mutation verifies the
   actor's active super-admin row and records `admin.save` in `auditLogs`.
4. The intended admin returns to `/admin`. The allowlist query updates reactively;
   refresh if the browser was disconnected.

An authenticated **Convex deployment owner** can perform the same operation from
PowerShell. This helper is deliberately limited to the development deployment
configured in `.env.local`. It refuses deployment-key overrides and production.
It uses the Convex CLI's privileged identity simulation, not a Clerk login or a
browser token. The existing mutation still requires the supplied actor to match
an active super-admin row. The audit entry identifies that simulated actor.

Run from the project root, using your own Convex CLI login:

```powershell
# Read-only: lists existing active super-admin identity keys.
node scripts/admin-access.mjs status quiet-chickadee-449

# Copy the target account's entire key from /admin/request-access.
$env:SAVVY_ADMIN_IDENTITY_KEY = Read-Host "Complete identity key of the account to approve"
$env:SAVVY_ADMIN_DISPLAY_NAME = Read-Host "Admin display name"

# Copy the existing active super-admin key from the status output above.
$env:SAVVY_ADMIN_ACTOR_KEY = Read-Host "Existing active super-admin identity key"

# target: dev (quiet-chickadee-449); grants this account super-admin access.
node scripts/admin-access.mjs grant quiet-chickadee-449

# Read-only allowlist check; expect role: super_admin and your display name.
node scripts/admin-access.mjs check quiet-chickadee-449
```

No key above is a password or bearer token. CLI access to the deployment is the
privileged credential. Never put a Convex deploy key, Clerk secret, or JWT into
frontend code. If no active super admin exists, the helper's grant fails closed;
the deployment owner must arrange audited recovery, rather than rerunning bootstrap.

### First admin on a genuinely empty installation

The former implementation was `admins:bootstrap`, a public mutation accepting
`ADMIN_BOOTSTRAP_SECRET` through `/admin/setup`. It rejected existing admin rows
but exposed a privileged provisioning endpoint to clients. It is now an
**internal mutation** with arguments `{ authUserId, displayName }`, executable
only by trusted backend code or authenticated deployment-owner CLI/dashboard.
There is no public wrapper, HTTP route, secret input, or automatic signup grant.

On a new development deployment only:

```powershell
# Confirm .env.local selects the intended development deployment.
# target: dev (quiet-chickadee-449); synchronize the reviewed local backend.
npx convex dev --once

$env:SAVVY_ADMIN_IDENTITY_KEY = Read-Host "Complete identity key from /admin/request-access"
$env:SAVVY_ADMIN_DISPLAY_NAME = Read-Host "First super-admin display name"

# Only succeeds when admins and adminBootstrapState are both empty.
# This MUST fail on the current already-provisioned installation.
node scripts/admin-access.mjs bootstrap quiet-chickadee-449
node scripts/admin-access.mjs check quiet-chickadee-449
```

Use the actual new dev deployment name in place of `quiet-chickadee-449` if
configuring a separate installation. The helper must match `CONVEX_DEPLOYMENT`.
Its bootstrap command invokes the standard CLI operation
`convex run admins:bootstrap '{"authUserId":"COMPLETE_IDENTITY_KEY","displayName":"Organizer"}'`
with JSON passed directly as an argument, avoiding Windows shell escaping.

Bootstrap creates an active `super_admin` row, an `admin.bootstrap` audit entry,
and an `adminBootstrapState` completion record in one database transaction.
Competing attempts are serialized by Convex. Existing admin rows (including
inactive entries) block initial setup on older installations. The completion
record also blocks reuse after revocation or deletion of the admin row. It has
no public update/delete API. When upgrading an already-provisioned installation,
the deployment owner seals it once without changing any existing permissions:

```powershell
# target: dev (quiet-chickadee-449); after synchronizing the reviewed backend.
npx convex run --deployment quiet-chickadee-449 admins:sealBootstrap '{}'
```

This has already been performed for the current dev installation. The internal
seal operation is idempotent and cannot create/reactivate an admin.
Deployment owners retain their inherent ability to administer the database;
do not delete the completion record or reset the allowlist as an access workflow.

After approval, use `/admin/setup` to initialize the event edition only if needed.
The edition form is available exclusively to a signed-in, allowlisted super
admin and the backend independently enforces the same requirement. It creates
the six categories. An already configured edition is not recreated.

`ADMIN_BOOTSTRAP_SECRET` is no longer used. If it remains on an older deployment,
remove it after confirming the target:

```powershell
# target: dev (quiet-chickadee-449)
npx convex env remove --deployment quiet-chickadee-449 ADMIN_BOOTSTRAP_SECRET
```

For production, follow `PRODUCTION_DEPLOYMENT.md` with the explicitly approved
production target. The dev helper intentionally cannot operate on production.
The deployment owner can run the same internal function in the production
dashboard's authenticated function runner after reviewing its arguments.

## Required configuration

| Setting | Where | Value |
|---|---|---|
| `CONVEX_DEPLOYMENT` | `.env.local` | `dev:quiet-chickadee-449` for this dev deployment |
| `NEXT_PUBLIC_CONVEX_URL` | `.env.local` / frontend build | `https://quiet-chickadee-449.ap-southeast-2.convex.cloud` |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `.env.local` / frontend build | Publishable key of the Clerk instance used for sign-in |
| `CLERK_SECRET_KEY` | `.env.local` / Next.js server | Server-only key for the same Clerk instance |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `.env.local` / frontend build | `/admin/login` |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex deployment env | Exact Clerk Frontend API URL matching the issued JWT |
| Clerk Convex integration / JWT template | Clerk dashboard | Token template `convex`, audience `convex` |

`SAVVY_ADMIN_IDENTITY_KEY`, `SAVVY_ADMIN_DISPLAY_NAME`, and `SAVVY_ADMIN_ACTOR_KEY`
are temporary operator inputs in the current terminal. They are not deployment
settings, bootstrap secrets, or frontend configuration. Clear them afterward:

```powershell
Remove-Item Env:SAVVY_ADMIN_IDENTITY_KEY, Env:SAVVY_ADMIN_DISPLAY_NAME, Env:SAVVY_ADMIN_ACTOR_KEY -ErrorAction SilentlyContinue
```

## Verification

Verified on 29 October 2026 against dev `quiet-chickadee-449`:

- The actual signed-in `Ggg Uuu` browser session opens `/admin` with **Event control**,
  live dashboard data, and super-admin navigation. `/admin/admins` opens **Admin access**.
- The final allowlist has 19 rows: two active super admins and 17 revoked entries.
  Exactly one account was granted access during the fix; the verification script
  made no grants. Bootstrap completion is sealed, and another owner-CLI bootstrap
  attempt was rejected without creating an account.
- Live real-Clerk checks reject an unlisted account and anonymous callers from
  protected data and access management. Both bootstrap functions are inaccessible
  via public clients, including a client with a super-admin JWT.
- `npm run lint`, `npm run build`, and the 59-test suite passed. The targeted admin
  tests cover 16 cases, including persistent completion for legacy installations.
- Sanitized live evidence: `verification-evidence/admin-access.json`; screenshot
  of the actual approved browser: `verification-evidence/admin-approved.png`.
  These artifacts are ignored by Git. No passwords, secrets, or JWTs are included.

```powershell
npx vitest run convex/admins.test.ts tests/admin-access.test.tsx
npm run lint
npm test
npm run build
# Guarded live development checks; creates and deletes one unlisted Clerk test user.
node scripts/verify-admin-access.mjs
```

The backend tests exercise real Convex handlers in `convex-test` with distinct
identities: approved super admin, other signed-in user, same subject under a
different issuer, editor, revoked user, and anonymous caller. They verify both
dashboard data reads, access-management denial, initialization permission,
audit creation, malformed key rejection, and permanent bootstrap completion.
Rendering tests verify the admin layout hides protected children for denied
accounts and the setup page has no browser provisioning form.
The live script requires the existing explicitly approved development verification
super-admin fixture; it never bootstraps an account or grants itself permissions.

For the actual account, sign in normally through Clerk, confirm the copied key,
then open `/admin`: expect **Event control** and permitted navigation. Super
admins can open `/admin/admins` and `/admin/audit`. Test a separate unlisted Clerk
account in a separate browser profile: expect **Access denied** and rejection of
protected backend reads/writes. Signed-out users must see **Admin sign in required**.
An editor must be denied `/admin/admins`, `/admin/settings`, and `/admin/audit`.
Revoking an account through an active super admin must remove dashboard access.

The CLI `check` command alone is an allowlist check with owner-simulated identity;
it does not prove that the real browser obtained a Clerk JWT. Live verification
must also confirm the normal Clerk-to-Convex token path. A direct unauthenticated
or authenticated Convex client call to `admins:bootstrap` must fail because the
function is internal, even when the caller has a valid super-admin JWT.

## Files and trust boundaries

- `app/layout.tsx`, `app/providers.tsx`, `proxy.ts`, `app/admin/login/page.tsx`:
  existing Clerk session and Convex token delivery.
- `convex/auth.config.ts`: issuer validation and audience `convex`.
- `convex/schema.ts`: `admins`, `adminBootstrapState`, and `auditLogs`.
- `convex/lib/security.ts`: unchanged server-side `requireAdmin` enforcement.
- `convex/admins.ts`: own identity/status reads, super-admin-only grants, internal bootstrap.
- `app/admin/layout.tsx`: existing dashboard/role gates; backend enforcement remains authoritative.
- `app/admin/request-access/page.tsx`: displays only the current signed-in user's key.
- `app/admin/setup/page.tsx`: protected edition setup; no bootstrap form.
- `app/admin/admins/page.tsx`: existing super-admin access-management UI.
- `scripts/admin-access.mjs`: deployment-owner-only dev CLI wrapper.
- `scripts/verify-development.mjs`: requires an explicitly approved verification
  account; no longer creates bootstrap secrets or grants itself admin rights.

References: [Convex internal functions](https://docs.convex.dev/functions/internal-functions),
[CLI run and identity simulation](https://docs.convex.dev/cli/reference/run),
[Clerk integration](https://docs.convex.dev/auth/clerk),
[provider-scoped identity](https://docs.convex.dev/api/interfaces/server.UserIdentity).
