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
import { DeleteEventDialog } from "@/components/admin/events/delete-dialog";
import { WinnersDialog } from "@/components/admin/events/winners-dialog";
import { EventDialog, EventPublicationStatus, statuses, statusLabel, type EventRecord, type EventStatus } from "@/components/admin/events/shared";
import { AdminPageHeader, FeedbackToast, Segmented, useFeedback } from "@/components/admin/admin-ui";
import { friendlyResultsError } from "@/lib/results-editor";

export default function Page() { return <Load fallback={<><AdminPageHeader title="Event manager" description="Plan the programme, update event status and publish official results." /><Skeleton label="Loading events and schools…" /></>}>{edition => <Manager editionId={edition._id} />}</Load>; }

function Manager({ editionId }: { editionId: Id<"editions"> }) {
  const categories = useQuery(api.categories.listCurrent, { editionId });
  const schools = useQuery(api.schools.listAdmin, { editionId });
  const events = useQuery(api.events.listAdmin, { editionId });
  const self = useQuery(api.admins.getSelf, {});
  const save = useMutation(api.events.save);
  const remove = useMutation(api.events.remove);
  const [editing, setEditing] = useState<EventRecord>();
  const [formVersion, setFormVersion] = useState(0), [dirty, setDirty] = useState(false), [formBusy, setFormBusy] = useState(false);
  const [resultEvent, setResultEvent] = useState<Id<"events">>();
  const [search, setSearch] = useState(""), [status, setStatus] = useState(""), [category, setCategory] = useState(""), [sort, setSort] = useState("programme");
  const [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const { feedback, success, clear: clearFeedback } = useFeedback();
  const [transition, setTransition] = useState<{ event: EventRecord; status: EventRecord["status"] }>();
  const [deleting, setDeleting] = useState<EventRecord>(), [deleteBusy, setDeleteBusy] = useState(false), [deleteError, setDeleteError] = useState("");
  const formPanel = useRef<HTMLDivElement>(null), lock = useRef(false), deleteLock = useRef(false);
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
      await save({ editionId, id: current._id, title: current.title, categoryId: current.categoryId, expectedCategoryId: current.categoryId, expectedUpdatedAt: current.updatedAt, venue: current.venue, description: current.description, status: transition.status as EventStatus });
      success(`${current.title} is now ${statusLabel(transition.status)}.`); setTransition(undefined);
    } catch (cause) { setError(friendlyResultsError(cause)); }
    finally { lock.current = false; setBusy(false); }
  }
  async function deleteEvent() {
    if (!deleting || deleteLock.current) return;
    deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
    try {
      await remove({ eventId: deleting._id, expectedUpdatedAt: deleting.updatedAt });
      if (editing?._id === deleting._id) reset();
      success(`${deleting.title} was deleted.`); setDeleting(undefined);
    } catch (cause) { setDeleteError(friendlyResultsError(cause)); }
    finally { deleteLock.current = false; setDeleteBusy(false); }
  }
  function clear() { setSearch(""); setStatus(""); setCategory(""); setSort("programme"); }
  const header = (busyForm: boolean) => <AdminPageHeader title="Event manager" description="Plan the programme, update event status and publish official results." actions={<button className="button" disabled={busyForm} onClick={() => edit()}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>New event</button>} />;
  if (!categories || !schools || !events || !self) return <>{header(true)}<Skeleton label="Loading events and schools…" /></>;
  const filtered = events.filter(event => (!search.trim() || `${event.title} ${event.venue ?? ""}`.toLowerCase().includes(search.trim().toLowerCase())) && (!status || event.status === status) && (!category || event.categoryId === category)).sort((a, b) => sort === "updated" ? b.updatedAt - a.updatedAt : Number(b.status === "live") - Number(a.status === "live") || Number(b.status === "upcoming") - Number(a.status === "upcoming") || a.createdAt - b.createdAt);
  return <div className="event-manager">
    {header(formBusy)}
    <div className="event-manager-grid">
      <div className="event-create-panel" ref={formPanel}><EventForm key={`${editing?._id ?? "new"}:${formVersion}`} editionId={editionId} categories={categories} schools={schools} events={events} event={editing} latest={events.find(event => event._id === editing?._id)} onSaved={() => { success(editing ? "Event updated." : "Event created. It now appears in the event feed."); reset(); }} onCancel={editing ? reset : undefined} onDirtyChange={setDirty} onBusyChange={setFormBusy} /></div>
      <section className="event-feed" aria-labelledby="event-feed-title">
        <header className="event-feed-heading"><h2 id="event-feed-title">Event feed</h2><span className="admin-count" aria-label={`${events.length} events`}>{events.length}</span></header>
        <div className="event-status-filter"><Segmented label="Filter by status" value={status} onChange={setStatus} options={[{ value: "", label: "All", count: events.length }, ...statuses.map(value => ({ value, label: statusLabel(value), count: events.filter(event => event.status === value).length })).filter(option => option.count || option.value === status)]} /></div>
        <div className="event-feed-filters">
          <label className="field event-search"><span>Search events</span><input type="search" placeholder="Event title or venue" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label className="field"><span>Category</span><select value={category} onChange={e => setCategory(e.target.value)}><option value="">All categories</option>{categories.map(value => <option key={value._id} value={value._id}>{value.name}</option>)}</select></label>
          <label className="field"><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="programme">Live & upcoming first</option><option value="updated">Recently updated</option></select></label>
        </div>
        <div className="event-feed-summary"><span role="status">Showing {filtered.length} of {events.length} events</span>{(search || status || category || sort !== "programme") && <button className="text-link" onClick={clear}>Clear filters</button>}</div>
        {!filtered.length && <EmptyState title={events.length ? "No matching events" : "The programme starts here"}>{events.length ? "Adjust your filters or clear them to see the full programme." : "Create your first event with the form on this page."}</EmptyState>}
        {filtered.map(event => <article className="event-feed-item" key={event._id} data-status={event.status}>
          <div className="event-item-title"><h3>{event.title}</h3><span className="pill" data-status={event.status}>{statusLabel(event.status)}</span></div>
          <div className="event-metadata">
            <span>{event.categoryName}</span>
            <span><Icon name="pin" /> {event.venue || "Venue to be announced"}</span>
            <EventParticipants ids={event.participatingSchoolIds} schools={schools} />
          </div>
          <div className="event-results">
            <div className="event-results-state"><span className="event-results-label">Results</span><EventPublicationStatus event={event} /></div>
            {event.activePublishedRevisionId ? <PublishedPreview eventId={event._id} /> : <p className="small">{event.publicationState === "revoked" ? "Official results were withdrawn. Publication history is kept." : event.hasDraftResults ? "A private draft is saved and not yet public." : "No results entered yet."}</p>}
          </div>
          <div className="event-item-actions">
            <button className="button compact" onClick={() => setResultEvent(event._id)}><Icon name="trophy" /> {event.activePublishedRevisionId ? "Manage winners" : "Enter winners"}</button>
            <button className="button secondary compact" disabled={formBusy} onClick={() => edit(event)}>Edit event</button>
            <label className="event-status-control"><span className="sr-only">Status for {event.title}</span><select value={event.status} disabled={busy} onChange={e => { setError(""); setTransition({ event, status: e.target.value as EventRecord["status"] }); }}>{statuses.map(value => <option key={value} value={value}>{statusLabel(value)}</option>)}</select></label>
            {event.activePublishedRevisionId && <Link className="text-link" href={`/events/${event.slug}`}>Public page <Icon name="arrow" /></Link>}
            <button className="button secondary danger compact event-delete" disabled={formBusy || deleteBusy} onClick={() => { setError(""); setDeleteError(""); setDeleting(event); }}><Icon name="trash" /> Delete</button>
          </div>
        </article>)}
      </section>
    </div>
    {resultEvent && <WinnersDialog eventId={resultEvent} schools={schools} canPublish={self.role === "super_admin"} onClose={() => setResultEvent(undefined)} />}
    {deleting && <DeleteEventDialog event={deleting} busy={deleteBusy} error={deleteError} onCancel={() => { if (!deleteBusy) { setDeleting(undefined); setDeleteError(""); } }} onConfirm={deleteEvent} />}
    {transition && <EventDialog title="Update event status" busy={busy} onClose={() => setTransition(undefined)}><div className="event-dialog-body"><p>Change <strong>{transition.event.title}</strong> from {statusLabel(transition.event.status)} to <strong>{statusLabel(transition.status)}</strong>?</p><p className="small">The public schedule updates immediately. Published results and points remain as they are.</p>{error && <p className="error" role="alert">{error}</p>}</div><footer className="event-dialog-footer actions"><button className="button secondary" disabled={busy} onClick={() => setTransition(undefined)}>Cancel</button><button className="button" disabled={busy} onClick={updateStatus}>{busy ? "Updating…" : "Update status"}</button></footer></EventDialog>}
    <FeedbackToast feedback={feedback} onDismiss={clearFeedback} />
  </div>;
}

function EventParticipants({ ids, schools }: { ids?: Id<"schools">[]; schools: { _id: Id<"schools">; name: string }[] }) {
  if (!ids?.length) return <span>Open to all schools</span>;
  const names = ids.map(id => schools.find(school => school._id === id)?.name ?? "Removed school");
  return <details className="event-participants"><summary>{ids.length} participating {ids.length === 1 ? "school" : "schools"}</summary><p>{names.join(", ")}</p></details>;
}

function PublishedPreview({ eventId }: { eventId: Id<"events"> }) {
  const results = useQuery(api.results.getPublishedByEvent, { eventId });
  if (!results) return <p className="small" role="status">Loading published winners…</p>;
  const winners = results.filter(row => row.placement && row.placement <= 3).sort((a, b) => a.placement! - b.placement!);
  return winners.length ? <ul className="event-podium" aria-label="Published winners">{winners.map((row, index) => <li key={`${row.schoolId}:${index}`}><span className="podium-place">{row.placement === 1 ? "1st" : row.placement === 2 ? "2nd" : "3rd"}{winners.filter(winner => winner.placement === row.placement).length > 1 ? " · Tied" : ""}</span><strong>{row.schoolName}</strong><span>{row.points} pts</span></li>)}</ul> : <p className="small">{results.length} official result {results.length === 1 ? "entry" : "entries"} · No podium placements recorded</p>;
}
