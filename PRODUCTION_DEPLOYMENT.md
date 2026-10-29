# Savvy Hunt production deployment instructions

Prepared 28 October 2026. **Instructions only: no production deployment was performed.**
Read `PHASE4_RELEASE_REPORT.md` before release. Drive folder access, approved-image
verification, credential rotation and organizer sign-off are release gates.

## 1. Freeze the release candidate

Review the complete Git diff, including the gallery upload/sync work present in this
workspace. Its optional schema fields and additional gallery tables require explicit
review; they are separate from the Phase 4 frontend fixes. Preserve scoring revision
pointers, transaction boundaries, authorization and audit history. Commit the lockfile
and CLI-generated Convex bindings with the reviewed source. Never commit `.env.local`,
service-account JSON, private keys, tokens or verification artifacts.

Run from the reviewed checkout against development:

```powershell
npm ci
npm run lint
npm test
npm run build
npm audit
node scripts/phase4-security.mjs
```

Repeat the documented live/browser checks after final source changes. The Phase 4
scripts intentionally reject production targets; never bypass their guards for launch.
Save sanitized evidence securely. A passing local build is not a production rehearsal.

## 2. Provision separate environments

Use school-owned accounts and name primary/backup owners for Vercel, Convex, Clerk,
Drive and the domain. Keep preview and production credentials and data separate.

| Variable | Vercel server/build | Convex deployment | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_CONVEX_URL` | Production URL at build time | — | Public endpoint; must match deployed backend |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Production Clerk publishable key | — | Public by design; do not reuse test instance |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | `/admin/login` | — | Sign-in route |
| `CLERK_SECRET_KEY` | Production secret | — | Server only; rotate the previously exposed development key separately |
| `CLERK_JWT_ISSUER_DOMAIN` | Optional local documentation value | Production issuer | Issuer domain, never a JWKS URL; audience/template `convex` |
| `GOOGLE_DRIVE_FOLDER_ID` | Approved folder | Same approved folder | Share with configured service account |
| `GOOGLE_DRIVE_INCOMING_FOLDER_ID` | Optional incoming folder | Same value | Omit to use the approved folder for both |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Service-account email | Same value | Existing service-account architecture |
| `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Private key | Same value | Secret; actual or escaped newlines supported |
| `GALLERY_PROXY_SECRET` | Random secret | Identical secret | Never a browser variable |
| `CONVEX_DEPLOY_KEY` | Scoped build secret, if CI deploys backend | — | Production key only in Production; preview key only in Preview |

The independently added gallery supports optional OAuth credentials for personal
My Drive writes. Do not switch modes merely to conceal the present access failure.
If uploads/moves are required, confirm the school's approved write mode and follow
`docs/gallery-drive-setup.md`. Service-account reads of a shared My Drive folder and
service-account ownership of new uploads have different requirements.

## 3. Close the Drive gate first

Verify the folder ID in both server environments. The service account must obtain a
token **and** receive `200` for folder metadata. An empty list after a folder `404`
does not prove successful folder access. Use organizer-approved development fixtures
before repeating on the production infrastructure.

Record this matrix with real files, not mocked responses:

| Scenario | Required outcome |
|---|---|
| Valid image, no consent | Rejected and never public |
| Approved valid image | Correct bytes and accessible description render on home/gallery |
| Hidden approved image | Removed reactively; direct endpoint stops serving bytes |
| Unsupported, empty, oversized, wrong-folder, trashed file | Rejected; no publication |
| Replaced bytes | Old approval cannot serve replacement; explicit re-review required |
| Deleted file or lost sharing | Safe unavailable-image fallback; no page crash |
| Hide during download or delayed approval | No stale action restores withdrawn publication |
| Private preview | Anonymous/non-admin requests denied |

Confirm consent ownership, takedown response time, folder permissions, expected image
volume, provider quotas and bandwidth budget. Rehearse image traffic separately from
scoreboard subscriptions. An image already downloaded to a visitor cannot be recalled.

## 4. Configure the approved deployment pipeline

Do not execute these production steps until the release gates are signed off and
production authorization is given. Before each backend command, identify the exact
deployment and inspect deployment-key overrides. `convex deploy` normally targets
production even when local development configuration is present.

For a reviewed Vercel pipeline, Convex documents this build-command form:

```text
npx convex deploy --cmd 'npm run build' --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL
```

Use the appropriate deployment key for each Vercel environment. Configure Clerk's
production domain, redirects and JWT template before accepting staff sessions. Deploy
the reviewed backend and matching frontend together. Do not point production at
`quiet-chickadee-449` or run verification fixture scripts there. See the
[official Convex Vercel guide](https://docs.convex.dev/production/hosting/vercel) and
[deploy target rules](https://docs.convex.dev/cli/reference/deploy).

## 5. Launch rehearsal and handover

1. Export/backup pre-existing production data and rehearse recovery into an isolated
   nonproduction target. Record backup location, access owner and reconciliation method.
2. Provision the intended first super admin using the internal `admins:bootstrap`
   function in the authenticated deployment-owner dashboard/CLI, with the complete
   identity key and display name. This runs only on an empty installation; existing
   super admins grant further access through `/admin/admins`. Follow
   `docs/admin-setup.md`, remove any obsolete `ADMIN_BOOTSTRAP_SECRET`, and configure
   the official edition/roster through protected workflows. Do not import development fixtures.
3. On real staff devices, rehearse password/MFA/OAuth, sign-out, account recovery,
   lost-device handling and revocation with the chosen policy. Development test OTPs
   prove application integration, not delivery to real staff mailboxes.
4. Verify publisher/editor permissions and publish/correct/revoke with two independent
   anonymous spectators. Keep a separately labeled rehearsal edition and reconcile afterward.
5. Rehearse the actual audience, page mix and media demand on approved hosting. Current
   evidence is 500 real development WebSocket clients for roughly 41 seconds, not a
   sustained 500-browser production test. Agree a latency target and watch provider usage.
6. Check mobile networks, reconnects, keyboard/screen-reader access, domain/HTTPS and
   public content. Confirm school-approved scoring, ties, dates, venues and photo policy.
7. Name the final approver, primary/backup result publisher, media moderator, incident
   contact and rollback owner. Keep a judge-approved manual tally and alternate network.

## 6. Incident and rollback procedure

- Uncertain publication: inspect the active official revision before retrying. Never
  overwrite aggregate totals or delete published revisions to repair a score.
- Wrong score: create a correction with a reason, review deltas, publish once and check
  category/overall/event pages from an anonymous device. Use audited revoke for withdrawal.
- Image complaint: hide immediately and verify the endpoint refuses bytes. Restrict Drive
  sharing if necessary; retain the moderation/audit record.
- Frontend regression: restore the known-good Vercel release after confirming backend compatibility.
- Backend regression: stop publication, preserve/export current data and audit history,
  restore compatible code and reconcile totals against active revisions before resuming.
- Credential exposure: rotate at the provider, replace secrets in all executing
  environments, invalidate affected sessions as appropriate and repeat authentication checks.

Release only after the named organizer accepts the evidence and all mandatory gates pass.
