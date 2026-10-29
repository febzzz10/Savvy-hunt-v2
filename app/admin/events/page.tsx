"use client";

import "./events.css";

import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Load } from "@/components/data";
import { EmptyState, Icon, Skeleton } from "@/components/ui";
import { EventForm } from "@/components/admin/events/event-form";
import { WinnersDialog } from "@/components/admin/events/winners-dialog";
import { EventDialog, EventPublicationStatus, eventDate, localDate, statuses, statusLabel, type EventRecord, type EventStatus } from "@/components/admin/events/shared";
import { friendlyResultsError } from "@/lib/results-editor";

export default function Page() { return <Load>{edition => <Manager editionId={edition._id} />}</Load>; }

function Manager({ editionId }: { editionId: Id<"editions"> }) {
  const categories = useQuery(api.categories.listCurrent, { editionId });
  const schools = useQuery(api.schools.listAdmin, { editionId });
  const events = useQuery(api.events.listAdmin, { editionId });
  const self = useQuery(api.admins.getSelf, {});
  const save = useMutation(api.events.save);
  const [editing, setEditing] = useState<EventRecord>();
  const [formVersion, setFormVersion] = useState(0), [dirty, setDirty] = useState(false), [formBusy, setFormBusy] = useState(false);
  const [resultEvent, setResultEvent] = useState<Id<"events">>();
  const [search, setSearch] = useState(""), [status, setStatus] = useState(""), [category, setCategory] = useState(""), [date, setDate] = useState(""), [sort, setSort] = useState("programme");
  const [notice, setNotice] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [transition, setTransition] = useState<{ event: EventRecord; status: EventRecord["status"] }>();
  const formPanel = useRef<HTMLDivElement>(null), lock = useRef(false);
  function reset() { setEditing(undefined); setDirty(false); setFormVersion(v => v + 1); }
  function edit(event?: EventRecord) {
    if (formBusy || (dirty && !confirm("Discard your unsaved event changes?"))) return;
    setEditing(event); setFormVersion(v => v + 1);
    requestAnimationFrame(() => { formPanel.current?.scrollIntoView({ behavior: "instant", block: "start" }); formPanel.current?.querySelector("input")?.focus(); });
  }
  async function updateStatus() {
    if (!transition || lock.current) return;
    const current = events?.find(event => event._id === transition.event._id);
    if (!current || current.updatedAt !== transition.event.updatedAt) { setError("This event changed in another session. Close this dialog and select the status again."); return; }
    lock.current = true; setBusy(true); setError("");
    try {
      await save({ editionId, id: current._id, title: current.title, categoryId: current.categoryId, expectedCategoryId: current.categoryId, expectedUpdatedAt: current.updatedAt, participatingSchoolIds: current.participatingSchoolIds, startsAt: current.startsAt, endsAt: current.endsAt, venue: current.venue, description: current.description, status: transition.status as EventStatus });
      setNotice(`${current.title} is now ${statusLabel(transition.status)}.`); setTransition(undefined);
    } catch (cause) { setError(friendlyResultsError(cause)); }
    finally { lock.current = false; setBusy(false); }
  }
  function clear() { setSearch(""); setStatus(""); setCategory(""); setDate(""); setSort("programme"); }
  if (!categories || !schools || !events || !self) return <><h1>Event manager</h1><Skeleton label="Loading events and schools…" /></>;
  const filtered = events.filter(event => (!search.trim() || `${event.title} ${event.venue ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())) && (!status || event.status === status) && (!category || event.categoryId === category) && (!date || localDate(event.startsAt).startsWith(date))).sort((a, b) => sort === "updated" ? b.updatedAt - a.updatedAt : sort === "latest" ? b.startsAt - a.startsAt : sort === "programme" ? Number(b.status === "live") - Number(a.status === "live") || Number(b.status === "upcoming") - Number(a.status === "upcoming") || a.startsAt - b.startsAt : a.startsAt - b.startsAt);
  return <div className="event-manager">
    <header className="event-manager-heading"><div><Link className="text-link" href="/admin">← Back to dashboard</Link><h1>Event manager</h1><p className="muted">Manage the programme and publish official event results.</p></div><button className="button secondary" disabled={formBusy} onClick={() => edit()}>+ Create event</button></header>
    {notice && <p className="event-notice" role="status">{notice}</p>}
    <div className="event-manager-grid">
      <div className="event-create-panel" ref={formPanel}><EventForm key={`${editing?._id ?? "new"}:${formVersion}`} editionId={editionId} categories={categories} schools={schools} event={editing} latest={events.find(event => event._id === editing?._id)} onSaved={() => { setNotice(editing ? "Event updated." : "Event created. It is now in the event feed."); reset(); }} onCancel={editing ? reset : undefined} onDirtyChange={setDirty} onBusyChange={setFormBusy} /></div>
      <section className="event-feed" aria-labelledby="event-feed-title">
        <header className="event-feed-heading"><h2 id="event-feed-title">Event feed</h2><span className="small">{events.length} {events.length === 1 ? "event" : "events"}</span></header>
        <div className="event-feed-filters">
          <label className="field event-search"><span>Search events</span><input type="search" placeholder="Event title or venue" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label className="field"><span>Status</span><select value={status} onChange={e => setStatus(e.target.value)}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
          <label className="field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value._id} value={value._id}>{value.name}</option>)}</select></label>
          <label className="field"><span>Date · IST</span><input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
          <label className="field"><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="programme">Live & upcoming first</option><option value="soonest">Start date: earliest</option><option value="latest">Start date: latest</option><option value="updated">Recently updated</option></select></label>
        </div>
        <div className="event-feed-summary"><span role="status">Showing {filtered.length} of {events.length} events</span>{(search || status || category || date || sort !== "programme") && <button className="text-link" onClick={clear}>Clear filters</button>}</div>
        {!filtered.length && <EmptyState title={events.length ? "No matching events" : "The programme starts here"}>{events.length ? "Adjust your filters or clear them to see the full programme." : "Create your first event using the panel alongside this feed."}</EmptyState>}
        {filtered.map(event => <article className="event-feed-item" key={event._id}>
          <div className="event-item-title"><h3>{event.title}</h3><span className="pill" data-status={event.status}>{statusLabel(event.status)}</span></div>
          <p className="event-category">{event.categoryName} <EventPublicationStatus event={event} /></p>
          <div className="event-metadata"><span><Icon name="calendar" /> {eventDate(event.startsAt)} IST</span><span><Icon name="pin" /> {event.venue || "Venue to be announced"}</span></div>
          <p className="small event-participants">{event.participatingSchoolIds?.length ? `${event.participatingSchoolIds.length} participating schools · ${event.participatingSchoolIds.map(id => schools.find(s => s._id === id)?.name ?? "Archived school").join(", ")}` : "Open to all active schools"}</p>
          {event.activePublishedRevisionId ? <PublishedPreview eventId={event._id} /> : <p className="small">{event.publicationState === "revoked" ? "Official results withdrawn. Publication history is retained." : event.publicationState === "draft" ? "Draft results are private." : "Results have never been published."}</p>}
          <div className="event-item-actions"><button className="button" onClick={() => setResultEvent(event._id)}><Icon name="trophy" /> {event.activePublishedRevisionId ? "Manage winners" : "Enter winners"}</button><button className="button secondary" disabled={formBusy} onClick={() => edit(event)}>Edit event</button><label className="event-status-control"><span className="sr-only">Status for {event.title}</span><select value={event.status} disabled={busy} onChange={e => { setError(""); setTransition({ event, status: e.target.value as EventRecord["status"] }); }}>{statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>{event.activePublishedRevisionId && <Link className="text-link" href={`/events/${event.slug}`}>View results <Icon name="arrow" /></Link>}</div>
        </article>)}
      </section>
    </div>
    {resultEvent && <WinnersDialog eventId={resultEvent} schools={schools} canPublish={self.role === "super_admin"} onClose={() => setResultEvent(undefined)} />}
    {transition && <EventDialog title="Update event status" busy={busy} onClose={() => setTransition(undefined)}><div className="event-dialog-body"><p>Change <strong>{transition.event.title}</strong> from {statusLabel(transition.event.status)} to <strong>{statusLabel(transition.status)}</strong>?</p><p className="small">The public schedule updates immediately. Published results and points remain as they are.</p>{error && <p className="error" role="alert">{error}</p>}</div><footer className="event-dialog-footer actions"><button className="button secondary" disabled={busy} onClick={() => setTransition(undefined)}>Cancel</button><button className="button" disabled={busy} onClick={updateStatus}>{busy ? "Updating…" : "Update status"}</button></footer></EventDialog>}
  </div>;
}

function PublishedPreview({ eventId }: { eventId: Id<"events"> }) {
  const results = useQuery(api.results.getPublishedByEvent, { eventId });
  if (!results) return <p className="small" role="status">Loading published winners…</p>;
  const winners = results.filter(row => row.placement && row.placement <= 3).sort((a, b) => a.placement! - b.placement!);
  return winners.length ? <ul className="event-podium" aria-label="Published winners">{winners.map((row, index) => <li key={`${row.schoolId}:${index}`}><span className="podium-place">{row.placement === 1 ? "1st" : row.placement === 2 ? "2nd" : "3rd"}{winners.filter(winner => winner.placement === row.placement).length > 1 ? " · Tied" : ""}</span><strong>{row.schoolName}</strong><span>{row.points} pts</span></li>)}</ul> : <p className="small">{results.length} official result {results.length === 1 ? "entry" : "entries"} · No podium placements recorded</p>;
}
