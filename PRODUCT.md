# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Students and parents on phones** during the competition day, checking what is live, what is next, and whether their school has won anything.
- **The big screen in the venue hall**: the site projected on a TV/projector as a live display for the room.
- **School staff (teachers, coordinators) on laptops**, checking standings, the schedule, and official results.

Organizers use the separate admin workspace; it is not the audience of the public pages.

## Product Purpose

Savvy Hunt is an inter-school competition platform. Its public site gives spectators and schools one trusted place for the programme, official published results, live school standings, organizer notices, and approved event photos. Success means people trust the scores, can see at a glance what is happening now, and feel the energy of the event.

## Positioning

Results are official and published by the organizers (drafts, publication, correction and revocation are controlled in admin); standings update live from Convex, so the public view is the same truth the organizers publish, not a fan-made tally.

## Operating Context

- Used live on event days: events move through scheduled → live → results published. Several events per category; schools earn points from placements.
- Phones in a noisy hall with one hand free; a projected screen read from across a room; laptops at desks.
- Photos appear only after organizer approval and consent.

## Capabilities and Constraints

- Public routes: `/`, `/scoreboard`, `/scoreboard/[slug]`, `/schedule`, `/events/[slug]`, `/results`, `/snapshots`, `/about`.
- Data is real-time (Convex subscriptions). Home shows live/next/latest summaries, leading schools, upcoming events, latest results, notices, snapshots.
- Venues may be unset ("Venue to be announced"); ties between schools exist; galleries may be empty.
- Stack: Next.js (App Router) + Convex.

## Brand Commitments

Confirmed by the user (2026-11-26):

- Keep the **Savvy Hunt** name and wordmark.
- Keep the **green and gold** colour family.
- Keep the **gold trophy photo** in the hero (`public/images/hero/trophy.webp`, `trophy-background.webp`).
- Keep the **large serif "Savvy Hunt" title** style.

## Evidence on Hand

- Real data comes from Convex at runtime: school names, points, events, categories, results, notices.
- Hero assets in `public/images/hero/` (trophy, botanical accent, brush stroke, handwritten accent).
- No testimonials, sponsors, attendance figures or stats beyond what the data provides; do not invent them.

## Product Principles

1. Official truth first: a score or result is shown only as the organizers published it.
2. "What's happening now" must be findable in one glance on a phone.
3. Feel like a celebration of school talent, without becoming childish or cartoony.
4. Never corporate or dull: the page should carry the event's energy.
5. Readable from across a hall as well as in a hand.

## Accessibility & Inclusion

Must stay readable on small phones in bright or dim halls and legible when projected at distance; avoid relying on colour alone for live/result states.
