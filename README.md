# Savvy Hunt

School event management website built with Next.js App Router, TypeScript, Tailwind CSS, Convex, Clerk, and Google Drive. **Do not use for official results until the checks in `FINAL_IMPLEMENTATION_REPORT.md` pass against a configured development deployment.**

## Development setup

1. Install Node.js 22 or newer. Run `npm ci` from this directory.
2. Create a **development** Clerk application and a separate **development** Convex project. In Clerk, configure a JWT template named `convex` with audience `convex`. Follow the [Convex Clerk setup](https://docs.convex.dev/auth/clerk) for the current issuer domain.
3. Copy `.env.example` to `.env.local`. Set `NEXT_PUBLIC_CONVEX_URL`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, and `CLERK_SECRET_KEY`. Do not put server secrets in a `NEXT_PUBLIC_` variable.
4. Run `npx convex dev` and complete its interactive login/project selection. This generates `convex/_generated/`, synchronizes `convex/auth.config.ts`, and deploys backend functions. Commit the CLI-generated bindings; do not edit them manually. Set `CLERK_JWT_ISSUER_DOMAIN` in the **Convex development deployment**.
5. Set a long random `ADMIN_BOOTSTRAP_SECRET` in the Convex development deployment. Sign in at `/admin/login` with the intended first super admin account, then visit `/admin/setup` and enter that one-time secret. Initialize the edition, which creates all six categories. Remove the bootstrap secret from Convex immediately afterward. No public signup grants admin access.
6. Run `npm run dev`. Use `/admin/admins` to add other allowlisted identities. A signed-in user may view their own provider-scoped identity key at `/admin/request-access` and give it to a super admin through an approved organization channel.

## Drive gallery setup

Organizers upload approved images into one controlled Google Drive folder. Create a service account with read access to that folder. Set `GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` in **both** the Convex deployment and Vercel server environment. Set the same long random `GALLERY_PROXY_SECRET` in both places; it is never a browser variable. The admin registers a Drive file ID, confirms organizer approval and photo consent, then the Convex action verifies folder membership, MIME type, size, and content checksum before publication. The public image route checks approval and Drive metadata and checksum again on every request and uses `no-store` so hiding or replacing a photo takes effect quickly. Supported types: JPEG, PNG, WebP, GIF, AVIF; maximum 15 MB.

## Verification

Run `npm run lint`, `npm test`, `npm run build`, and `npm audit`. Unit tests do not replace the required Convex integration and browser tests. In a **development** edition only, rehearse the full school → event → draft → publish → correction → revoke flow with a separate anonymous browser. Never seed demonstration scores in production.

## Production deployment

1. Create separate production Clerk and Convex projects. Configure their issuer, JWT template, and Vercel environment variables. Never reuse development data or credentials.
2. Generate bindings with the production-compatible schema and deploy Convex backend functions. Review schema changes and backup/export official data before any scoring migration.
3. Deploy the Next.js site to Vercel only after build, integration, security, responsive, and real-time checks pass. Set production Drive service account secrets and folder ID only in server-side environments.
4. Perform first-admin setup in production, remove the bootstrap secret, initialize the edition, then add authorized staff. Enter official schools and events through the admin UI.
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
