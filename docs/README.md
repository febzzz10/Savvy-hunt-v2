# Savvy Hunt documentation

Central index for project documentation. Start here, then follow the section that matches your task. Current source code takes precedence over every document in this tree.

## Canonical documents

These stay at the repository root and are the authority for their areas.

| File | Responsibility |
|---|---|
| [`README.md`](../README.md) | Project overview, local setup, commands and operations |
| [`agent.md`](../agent.md) | Engineering rules and AI coding-agent instructions |
| [`memory.md`](../memory.md) | Verified project knowledge, decisions and current implementation state |
| [`AGENTS.md`](../AGENTS.md) | Tool-discovered agent instructions |
| [`CLAUDE.md`](../CLAUDE.md) | Tool-discovered agent instructions |

## Getting started

| Document | Contents |
|---|---|
| [Admin setup](01-getting-started/admin-setup.md) | Clerk sign-in, allowlist provisioning, owner-only first-admin bootstrap, roles |

Repository setup and the command list live in the root [`README.md`](../README.md).

## Design

| Document | Contents |
|---|---|
| [Design system](04-design/design-system.md) | Authoritative visual and UI specification: tokens, typography, routes, components, accessibility |
| [Design handoff](04-design/design-handoff.md) | Earlier organizer-supplied handoff (historical subset of the design system) |
| [Event Manager video reference](04-design/event-manager-video-reference.md) | Design brief for the admin Events redesign, now implemented |

## Deployment

| Document | Contents |
|---|---|
| [Production deployment](05-deployment/production-deployment.md) | Release gates, environment separation, backup, rehearsal and rollback |
| [Gallery Drive setup](05-deployment/gallery-drive-setup.md) | Read-only service-account Drive permissions, configuration and 404 diagnosis |

## Reports

Reports are evidence of their date, not current configuration. Read the status banner first.

### Implementation

| Document | Contents |
|---|---|
| [Implementation notes](07-reports/implementation/implementation-notes.md) | Historical implementation log (October 2026) |
| [Final implementation report](07-reports/implementation/final-implementation-report.md) | Phase 3 completion summary and superseded blockers |
| [Gallery drive-only report](07-reports/implementation/gallery-drive-only-report.md) | Current read-only gallery verification (2026-10-29), supersedes the Phase 4 folder 404 |
| [Event Manager redesign](07-reports/implementation/event-manager-redesign.md) | What shipped for the admin Events interface |
| [Nature redesign](07-reports/implementation/nature-redesign.md) | Implemented visual direction and before/after evidence |
| [Hero implementation](07-reports/implementation/hero-implementation.md) | Hero section implementation report |

### Verification

| Document | Contents |
|---|---|
| [Phase 4 release report](07-reports/verification/phase4-release-report.md) | Release verification evidence, gates and NOT APPROVED verdict |
| [Final verification report](07-reports/verification/final-verification-report.md) | Historical Phase 3 verification evidence |
| [Gallery verification (2026-10-28)](07-reports/verification/2026-10-28-gallery-verification.md) | Dated gallery checks; Drive access was later restored |

### Troubleshooting

| Document | Contents |
|---|---|
| [Hydration fix report](07-reports/troubleshooting/hydration-fix-report.md) | SSR/hydration connection-status fix |
| [Connection diagnosis](07-reports/troubleshooting/connection-diagnosis.md) | Investigation of connection and Drive symptoms |
| [Event category editing fix](07-reports/troubleshooting/event-category-editing-fix.md) | Revoked-event category lock and history handling |

## Planning

Historical specifications record pre-implementation intent. They are useful context, not an active backlog.

| Document | Contents |
|---|---|
| [Product requirements](08-planning/historical/prd.md) | Original PRD |
| [Development plan](08-planning/historical/plan.md) | Original roadmap and phase plan |
| [Architecture](08-planning/historical/architecture.md) | Pre-implementation architecture and rationale |
| [Database](08-planning/historical/database.md) | Proposed schema and scoring contract |
| [Application flow](08-planning/historical/application-flow.md) | Original screen and state flows |
| [Technical specification](08-planning/historical/technical-specification.md) | Original implementation contract |
| [Dual gallery plan (2026-10-28)](08-planning/superpowers/2026-10-28-dual-gallery.md) | Superseded gallery planning |

## Archive

Superseded documents retained for context.

| Document | Contents |
|---|---|
| [Editorial redesign](archive/editorial-redesign.md) | Abandoned cobalt/Archivo direction, superseded by the nature redesign |
