# Savvy Hunt — Admin Events Redesign (Reference Video Adaptation)

> Status: Approved direction pending implementation. 29 October 2026.  
> Target: existing organizer Events interface, not a new application.  
> Visual references: `event-manager-reference.jpg` and `publish-winners-reference.jpg` extracted from the user-provided 32-second reference video.  
> Must also obey the main Savvy Hunt `design.md` specification.

## 1. Intent

Rework the existing `/admin/events` organizer experience into a fast two-column **Event Manager**. The reference video shows a left-side compact event creation form, a right-side event feed, status controls, event metadata, result actions, and a dedicated **Publish Winners** dialog with tied placements. Borrow its **interaction model and efficiency**, not its colors, business rules, authentication method, or database model.

**Non-negotiable:** Keep the real Savvy Hunt architecture: Next.js App Router, TypeScript, Tailwind CSS, Clerk, Convex, and the existing access rules, event controls, event-based manual scoring, automatic school/category aggregation, official publication workflows, and audit history. Do not build a standalone demo or duplicate scoring state.

## 2. Observations from the supplied video

- Light page with a small top header, Back to Dashboard, a Create Event card, and a Live Feed of events.
- Form inputs in the reference: event title, location, team count, status, category, an admin passcode, and Publish Event.
- Event rows show title, results-published badge, venue, team count, category, podium preview, status menu, Results action, trophy action, and delete action.
- Clicking the trophy opens a centered `Publish Winners` modal over a dimmed page.
- Modal groups `1st place`, `2nd place`, and `3rd place`; each group has a participant name and school selector, add-tie action, remove-entry control, and Confirm & Save.
- The example shows 10/6/2 point labels. **These are reference-only numbers and MUST NOT be hard-coded** unless the current Savvy Hunt scoring policy actually uses them.
- The example shows a separate admin passcode. **Do NOT reproduce it**: the existing protected Clerk/Convex authorization is the source of truth.

## 3. Savvy Hunt visual translation

Maintain the main site's light editorial nature-inspired style:

| UI token | Hex | Usage |
|---|---|---|
| Canvas | `#FAFAF6` | Page background |
| Surface | `#FFFFFF` | Cards, dialogs |
| Soft sage | `#F3F6EF` | Selected filters, calm subpanels |
| Green | `#32643B` | Primary actions, active indicators |
| Green hover | `#285130` | Hover |
| Ink | `#1F2A23` | Headings, body |
| Muted ink | `#606F62` | Supporting text |
| Border | `#DEE5DA` | Dividers, fields |
| Terracotta | `#D96B4E` | Live and attention accents |
| Gold | `#C59439` | First-place award highlight |
| Silver | `#7F8A90` | Second-place award highlight |
| Bronze | `#AF794F` | Third-place award highlight |

Use the already-selected site typography and components. Avoid orange-red gradient submit buttons, dark navy dialog header, cartoon emoji icons, giant boxes, and heavy shadows from the video. Use restrained Lucide icons plus clear words; maintain visible focus states. Prefer readable text labels to relying on icon-only actions.

## 4. Desktop layout

```text
Existing ADMIN NAV: Overview | Schools | Events | Scoreboard | Announcements
                   | Gallery | Settings | Admins | Audit | Public site
─────────────────────────────────────────────────────────────────────────────
Organizer workspace                                     Connection status
Events                                     [+ Create event]  [Other safe actions]
Manage, schedule, and publish official event results.
─────────────────────────────────────────────────────────────────────────────
┌─────────────────────────┐  ┌────────────────────────────────────────────┐
│ Create event            │  │ Event feed     [Search] [Status] [Category]│
│ Event title             │  │ [Date] [Sort]                              │
│ Category                │  │                                            │
│ Start date/time (IST)   │  │ Event A     Live · No published results    │
│ End date/time (IST)     │  │ Venue  • Category • Starts at             │
│ Venue                   │  │ Participating schools summary             │
│ Status                  │  │ [Manage] [Enter results] [More ▾]         │
│ Schools/teams (if used) │  │────────────────────────────────────────────│
│                         │  │ Event B     Completed · Results published │
│ [Create event]          │  │ First / second / third summary            │
└─────────────────────────┘  │ [View results] [Edit] [More ▾]           │
                             └────────────────────────────────────────────┘
```

Desktop widths: outer content max 1320–1440px, main left column 340–380px, right column `minmax(0, 1fr)`, gap 24px. The form may be position:sticky within the viewport only if it does not trap lower controls; allow normal scrolling. The right area may be a list, not a separate scroll container unless there is a compelling usability reason. Avoid using the browser's full width for one oversized form as in the current screenshot.

Page header should work within the **existing admin shell**, not create a separate disconnected menu or bypass its existing role-aware links.

## 5. Create Event panel

Keep the actual event fields in the codebase; visually group them into a compact task-focused form:

- **Event title:** required, sensible max length, inline error.
- **Category:** Category I, II, III, IV, V, Common Category; use existing backend IDs/values.
- **Starts at:** local date/time clearly labeled `Asia/Kolkata`.
- **Ends at:** optional; validate it is after start where supplied.
- **Venue:** optional or required according to current schema; useful placeholder.
- **Status:** valid existing statuses only; do not immediately call an event live merely because a select defaults to Live.
- **Participating schools / teams:** show only if supported by the existing data model. Use a multi-select of known schools, not a free-form arbitrary count pretending to associate schools.
- **Save/create:** explicit submit, loading/pending and success/error feedback. The save action must use the existing authenticated Convex mutation.

Keep an unsaved-change warning if the user navigates away while creating/editing. Do not ask for an extra admin passcode. If there is a business requirement for step-up authorization, use the existing secure identity and role model, not a shared secret in the UI.

## 6. Event Feed

Call this **Event feed** or **Manage events** rather than *Live Feed*, because it includes upcoming, live, completed, cancelled, and published events.

### Header and filtering

- Visible total event count if available from real data.
- Search by event title and optionally venue.
- Filter by status and category; optional date range if already supported.
- Sort upcoming soonest first, then latest updated or start date as appropriate.
- No filter should mutate data; search and filters should preserve URL parameters if appropriate.
- Real-time updates via current Convex subscriptions; show existing SSR-safe connection indicator.

### Event item structure

Primary line: event title and status; separate publication badge (`Results published` / `Unpublished` / `Draft`) from event lifecycle status (`Upcoming` / `Live` / `Completed` / `Cancelled`).

Secondary line: category, date/time Asia/Kolkata, venue, participation count only if real data exists, and participating school/teams summary where supported.

Actions (permission-gated and only if existing operations are supported):

- **Edit event**: opens an editor for actual editable fields.
- **Update status**: use allowed state transitions; show confirmation for consequential transitions.
- **Manage results**: opens existing scoring workflow or adapted Publish Winners dialog.
- **View published results**: previews the official public-visible outcome.
- **Archive/delete**: tucked inside More; use confirmation, especially after scoring or publication. Prefer the existing backend's safe deletion constraints.

Avoid exposing icon-only destructive actions beside the primary action. If an event has no results, do not show an empty fictional podium; use `Results not published`.

## 7. Publish Winners dialog: the core interaction

Borrow the placement-oriented dialog in the video, but adapt to Savvy Hunt's verified scorer rules.

### Appearance and structure

- Accessible centered dialog max width ~640–720px, max height `min(85dvh, 860px)`, internal scrolling, sticky footer.
- Heading `Manage event results` or `Publish winners`, event name, category, publication status.
- First/second/third placement groups, each with clear rank label, a school selector, an optional participant/team field **if the backend actually stores it**, point preview from actual scoring policy, and an Add Tie action.
- Multiple entries in the same placement represent a tie. Use a `Remove` control on entries, with the last-row behavior clearly defined.
- Show the official score impact before publication if supported; do not fabricate a preview.
- Bottom actions: `Cancel`, `Save draft` where supported, and `Publish official results` (explicit, possibly confirmation). Do not silently conflate Save with Publish.

### Data model and validation safeguards

1. Load available schools from current school records; no arbitrary typed school string in official score records.
2. Every placement entry must reference the event and existing school ID; participant/team only where supported.
3. Prevent impossible duplicates across placements, unless a documented business rule permits it (e.g. event has independent sub-competitions).
4. Ties share the same placement rank; use competition ranking semantics already adopted in the backend.
5. Point allocations must come from the existing scoring configuration. Never copy the 10/6/2 numbers in the video without verification.
6. Preserve **event-based manual scoring with automatic aggregation**. The winners UI must call the current result/score APIs or adapt their frontend adapter, not create a second scoreboard.
7. Saving or editing published results must not double-award points. Ensure server-side transactional/idempotent update semantics via the existing implementation; add safeguards where missing without rewriting the model.
8. Publication and later revisions are authorized and audited on the backend. Display publication state honestly and never leak drafts publicly.
9. Require confirmation when a published result is being changed in a way that affects public standings.
10. Handle stale data from another organizer: reload, show conflict guidance, prevent overwriting newer published results.

**Crucial mapping:** The video's winner list is a **UI pattern**. If the current Savvy Hunt schema records school points per event but does not record individual participant names, the form must use school selection and rank/points only, not introduce a phantom `participantName` field or falsely imply student-level result tracking. Propose the optional enhancement separately rather than making an undocumented schema migration.

## 8. Example interaction paths

**Create:** Admin opens Events → completes required fields → Create event → authenticated mutation → new item appears in event feed with correct status and no result.

**Update status:** Admin uses event item status menu → picks allowed transition → confirm if needed → mutation → current page and public schedule update through Convex.

**Publish winners:** Admin opens Manage results → current results prepopulate, available schools loaded → adds first/second/third, possibly ties → validate → review actual point impact → publish → official result page and aggregate scoreboard update once.

**Edit published:** Authorized admin opens results → edits affected entries → sees publication/score consequence → confirms → backend replaces or adjusts existing official score records consistently; audit metadata records actor and change.

**Cancel:** Dialog closes without saving; if edited, confirm discarding unsaved changes.

## 9. Mobile and tablet

At widths below ~1024px stack panel and event feed. The Create Event panel may collapse behind `+ Create event` in the page header to prioritize browsing. Use a sheet/drawer only if already in the component library. Event cards become single-column. On small screens use full-screen dialog with sticky actions, large tap targets, and native-friendly select inputs. Never allow cropped Save/Publish buttons or horizontal page overflow.

## 10. Accessibility and usability

- Explicit labels, descriptions and error messages for all fields.
- Keyboard-accessible comboboxes, dialog trap, Escape behavior, focus return on close.
- Status and placement not conveyed by color alone.
- Inline save/publish errors and toast with live-region semantics.
- Disabled buttons accurately reflect pending mutations; prevent duplicate submissions.
- Respect reduced-motion preferences, consistent 44px touch targets on mobile.
- Clear signposting between draft results and public published results.
- No fake `Database Active` badge. Connection indicator should reflect actual existing Convex status.

## 11. Implementation order

1. Audit actual repo routes/components, Convex schema/query/mutation functions, roles and score publication logic.
2. Identify exact status values, categories, result models, tie behavior and point configurations. Write down mismatches between the video and real app.
3. Create the two-column event manager layout with current data; no backend change yet.
4. Refactor the event create/edit form into a compact shared form.
5. Add event feed actions and filters, all wired to existing backend functions.
6. Implement the accessible winners dialog by reusing existing scoring operations. If the model cannot support a part of the reference, maintain existing scoring and explain the gap.
7. Verify auth, permissions, real-time subscriptions, correctness of score aggregation, cancellations, and audited edits.
8. Test production build, TypeScript, lint, existing tests, and desktop/tablet/mobile browser flows. Preserve other admin sections and public pages.

## 12. Acceptance criteria

- [ ] Admin Events page visually reflects a compact create panel + informative event feed.
- [ ] Existing admin menu, Clerk role checks, and Convex auth stay intact.
- [ ] School/category/date fields continue to respect current schema and IST timezone.
- [ ] Event cards distinguish lifecycle status from publication status.
- [ ] Every visible management action is real, permission-checked, and responsive.
- [ ] Winner dialog supports editing all existing official placements and UI-level tied entries where real scoring supports them.
- [ ] A published result updates school-wise/category-wise scores exactly once.
- [ ] Drafts never appear as official published winners.
- [ ] Concurrent organizer edits and duplicate saves are handled safely.
- [ ] Works on 375px mobile, 768px tablet, and wide desktop.
- [ ] No hydration errors, uncontrolled input warnings, or failing production checks introduced.
- [ ] No unapproved fake results/photos, second database, new auth provider, or hard-coded demo school data.

## 13. Copy/paste agent instruction

> Read `design.md`, `ADMIN_EVENTS_VIDEO_REFERENCE.md`, and the two supplied reference screenshots. Inspect the existing Savvy Hunt source tree and map existing event and scoring capabilities before coding. Redesign the current admin Events page to match the reference video's efficient two-column Event Manager and Publish Winners modal while retaining the approved bright sage/ivory aesthetic. Reuse existing Next.js, Tailwind, Clerk, Convex, permissions, manual event-based scoring, aggregation and audit flows. Do not copy the video's hard-coded point scheme, extra passcode, or independent backend. Implement and verify the working page; report any gaps or constraints rather than silently inventing schema fields.
