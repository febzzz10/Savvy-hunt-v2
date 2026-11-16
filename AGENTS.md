<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Project-specific instructions

Read [agent.md](agent.md) and [memory.md](memory.md) before significant work. They hold the verified stack, architecture, invariants, commands and current project state.

- Canonical documentation: `README.md`, `agent.md`, `memory.md`. [docs/README.md](docs/README.md) indexes design, deployment, reports and historical planning; specs under `docs/08-planning/historical/` and dated reports are historical, and current source wins on conflict.
- Auth is Clerk (JWT template `convex`, `CLERK_JWT_ISSUER_DOMAIN`) plus the Convex `admins` allowlist checked by `requireAdmin`. There is no public signup and no browser bootstrap secret.
- The gallery is read-only: organizers upload in Google Drive, Convex syncs metadata every two minutes, and bytes are served only through `app/api/gallery/[itemId]/image/route.ts`. Do not add Google OAuth or website uploads.
- Run `npm run lint` and `npm test` after changes; run `npm run build` for routing, provider or styling changes.
