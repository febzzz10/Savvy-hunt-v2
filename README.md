# Savvy Hunt

School event management website built with Next.js App Router, TypeScript, Tailwind CSS, Convex, Clerk, and Google Drive. **See [the Phase 4 release report](PHASE4_RELEASE_REPORT.md) for current evidence and blockers, and [production deployment instructions](PRODUCTION_DEPLOYMENT.md) for the release procedure. The configured Drive folder is now readable; see the [Drive-only gallery report](docs/gallery-drive-only-report.md) for current gallery verification. No production deployment has been performed.**

## Development setup

1. Install Node.js 22 or newer. Run `npm ci` from this directory.
2. Create a **development** Clerk application and a separate **development** Convex project. In Clerk, configure a JWT template named `convex` with audience `convex`. Follow the [Convex Clerk setup](https://docs.convex.dev/auth/clerk) for the current issuer domain.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`. Do not put server secrets in a `NEXT_PUBLIC_` variable.
4. Run `npx convex dev` and complete its interactive login/project selection. This generates `convex/_generated/`, synchronizes `convex/auth.config.ts`, and deploys backend functions. Commit the CLI-generated bindings; do not edit them manually. Set `CLERK_JWT_ISSUER_DOMAIN` in the **Convex development deployment**.
5. Sign in at `/admin/login` and copy your complete identity key from `/admin/request-access`. Follow the [admin setup guide](docs/admin-setup.md): an existing super admin grants access through `/admin/admins`; on an empty installation only, the deployment owner runs the internal one-time bootstrap from the terminal. `/admin/setup` initializes the edition and six categories after approval. No public signup grants admin access, and there is no browser bootstrap secret.
6. Run `npm run dev`. Use `/admin/admins` to add other allowlisted identities. A signed-in user may view their own provider-scoped identity key at `/admin/request-access` and give it to a super admin through an approved organization channel.

## Drive gallery setup

Organizers upload photos **directly to Google Drive**. The website has no upload form or Google OAuth requirement. A read-only service account scans the gallery every 2 minutes using the existing Convex cron; active admins can also use **Sync Now**. New photos remain **Pending** until an administrator reviews the private preview and explicitly verifies publication consent. Pending, Approved and Rejected views, metadata editing, hiding, ordering and audit history remain available.

Set `GOOGLE_DRIVE_FOLDER_ID` to the gallery folder ID in **both** Convex deployment env and the Next.js/Vercel server env. Leave `GOOGLE_DRIVE_INCOMING_FOLDER_ID` unset to use that same folder for incoming photos. If a separate Incoming folder is set, an organizer must move photos manually into the gallery folder before approval; the application never writes to Google Drive.

Share the folder directly with `GOOGLE_SERVICE_ACCOUNT_EMAIL` as **Viewer**, and set `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` and the same `GALLERY_PROXY_SECRET` in both server environments. A shared personal My Drive folder is supported for this read-only workflow; a Workspace Shared Drive is optional. Supported images are JPEG, PNG, WebP, GIF and AVIF up to **15 MB**. Credentials remain server-side. See [the gallery setup guide](docs/gallery-drive-setup.md) for permissions, configuration and 404 diagnosis.

## Verification

Run `npm run lint`, `npm test`, `npm run build`, and `npm audit`. Unit tests do not replace the required Convex integration and browser tests. In a **development** edition only, rehearse the full school → event → draft → publish → correction → revoke flow with a separate anonymous browser. Never seed demonstration scores in production.

Repeat the live verification with `node scripts/verify-development.mjs`, `node scripts/verify-content.mjs`, and `node scripts/verify-browser.mjs`. These scripts are intentionally pinned to the current development deployment and Clerk test keys. They create labeled development fixtures, use real short-lived Clerk sessions, and save sanitized evidence under ignored `verification-evidence/`. The content script restores About settings and hides its announcement; scoring fixtures and audit history remain for review. Configure Drive separately for positive image scenarios. `node scripts/check-repository-secrets.mjs` checks configured private values against the Git index and current commit.

Phase 4 adds `scripts/phase4-drive.mjs`, `phase4-auth.mjs`, `phase4-ui.mjs`, `phase4-interactions.mjs`, `phase4-capacity.mjs`, `phase4-http.mjs`, and `phase4-security.mjs`. They pin development Convex and Clerk test credentials and save separate sanitized evidence. Drive preflight exits nonzero while access or fixture blockers remain. The capacity script opens at most 500 real development clients, writes labeled scoring fixtures, revokes its results and archives its school afterward; it does not certify production capacity. The authentication script creates and deletes a temporary Clerk test user and revokes its allowlist entry. It uses the documented test OTP, never real staff credentials.

For testing the optimized frontend, run `npm run build`, then `npx next start -p 3100` in a separate terminal. In PowerShell, set `$env:VERIFY_BASE_URL='http://localhost:3100'` before running the Phase 4 browser, authentication, interaction, Drive or HTML-traffic scripts. Clear it afterward with `Remove-Item Env:VERIFY_BASE_URL`. The earlier `verify-*.mjs` scripts still use port 3000. Run the scoring/capacity scripts sequentially so their fixtures do not affect one another's assertions.

`phase4-security.mjs` checks the working source, index and reachable Git history for configured secrets and selected key patterns. It is not a comprehensive forensic scan. The Clerk secret previously present in `.env.example` must still be rotated by the account owner; a clean source scan does not revoke it.

## Production deployment

1. Create separate production Clerk and Convex projects. Configure their issuer, JWT template, and Vercel environment variables. Never reuse development data or credentials.
2. Generate bindings with the production-compatible schema and deploy Convex backend functions. Review schema changes and backup/export official data before any scoring migration.
3. Deploy the Next.js site to Vercel only after build, integration, security, responsive, and real-time checks pass. Set production Drive service account secrets and folder ID only in server-side environments.
4. Perform owner-only first-admin setup in production using the internal bootstrap, initialize the edition, then add authorized staff. Follow [the admin setup guide](docs/admin-setup.md); remove any obsolete `ADMIN_BOOTSTRAP_SECRET`. Enter official schools and events through the admin UI.
5. Keep a manual tally sheet and a named decision maker for corrections during the event.

## Rollback

For a web-only regression, restore the last known good Vercel deployment. For a backend regression, stop result publication, export the current Convex data and audit history, and deploy the last known good backend version. **Do not roll back score records by deleting revisions or overwriting totals.** Reconcile active result revisions and `schoolCategoryTotals` before resuming publication. Rotate any exposed secret and invalidate affected sessions. Media takedowns should use the admin Hide action and confirm the image endpoint returns 404.

## Event-day rehearsal checklist

- [ ] Two authorized roles and one anonymous browser are open on separate sessions.
- [ ] Editor can create a school and event, change event status, and save a result draft; editor cannot publish or revoke.
- [ ] Draft points remain absent from public pages.
- [ ] Super admin previews and publishes; overall, category, event detail, results, and top three update in both anonymous sessions without refresh.
- [ ] Correction changes totals by the **delta** and records a reason; repeat publish does not double count.
- [ ] Revoke removes official points and winners, and audit history preserves all changes.
- [ ] Common Category contributes once overall and only to its own category view; ties show equal ranks.
- [ ] Approved Drive images render; hidden items disappear and their image endpoints stop serving them.
- [ ] Mobile schedule, scoreboard, admin forms, loading states, and poor-network recovery are checked.
- [ ] Manual score tally, support contacts, backups, and rollback owner are ready.
