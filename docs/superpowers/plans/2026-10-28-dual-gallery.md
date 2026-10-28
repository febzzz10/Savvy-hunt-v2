# Dual gallery implementation

Preserve the existing Next.js image proxy, Clerk admin allowlist, Convex gallery table,
reactive public queries, checksum verification, and legacy draft/hidden records.

1. Add a shared server Drive client: OAuth refresh tokens for My Drive, service-account
   access for reads and Shared Drive writes, folder validation, paginated image listing,
   metadata checks, ID-preserving moves, and idempotent uploads using generated Drive IDs.
   Test supported write modes, pagination parameters, missing configuration and failures.
2. Extend gallery metadata additively. Import both configured folders as pending; never
   infer consent from location. Poll every two minutes with leased, scheduled page actions.
   Reconcile only after complete listings; verify absent files individually. Preserve
   rejected/hidden states; revoke consent on changed bytes. Protect manual sync, upload
   intents, preview and approval with the existing admin allowlist. Approval moves the
   original file instead of copying it. Record consent and reviewer audit.
3. Add Pending, Approved, Rejected, Upload and Sync Now controls using existing styles.
   Send multipart uploads to a Clerk-authenticated server route, keep credentials private,
   and serve previews through the controlled no-store proxy. Document existing approved
   folder env and new incoming/OAuth options with manual Google setup.
4. Run targeted and full Vitest tests, TypeScript, ESLint, Next build and browser checks.
   Identify dev deployment before Convex codegen/deployment; report live Google blockers
   separately from mocked integration evidence. Do not overwrite pre-existing staged work.
