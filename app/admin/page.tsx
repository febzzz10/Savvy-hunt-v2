"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Load, ref } from "@/components/data";
import { GalleryPhoto } from "@/components/gallery-photo";
import { Skeleton } from "@/components/ui";
import { eventDate, statusLabel, type EventRecord } from "@/components/admin/events/shared";

type GallerySummary = {
  total: number;
  pending: number;
  recent: Array<{ _id: string; altText: string; filename?: string; approvalStatus: string; availability?: "present" | "missing"; createdAt: number; previewable: boolean }>;
};
type School = { _id: string; status: "active" | "archived" };

export default function Page() {
  return <><span className="eyebrow">Organizer workspace</span><h1>Overview</h1><Load>{edition => <Overview editionId={edition._id} />}</Load></>;
}

function Overview({ editionId }: { editionId: string }) {
  const schools = useQuery(ref<{ editionId: string }, School[]>("schools:listAdmin"), { editionId });
  const events = useQuery(ref<{ editionId: string }, EventRecord[]>("events:listAdmin"), { editionId });
  const gallery = useQuery(ref<{ editionId: string }, GallerySummary>("dashboard:gallerySummary"), { editionId });

  if (!schools || !events || !gallery) return <Skeleton label="Loading the organizer overview…" />;

  const activeSchools = schools.filter(school => school.status === "active").length;
  const live = events.filter(event => event.status === "live");
  const drafts = events.filter(event => event.hasDraftResults).sort((a, b) => b.updatedAt - a.updatedAt);
  const next = events.filter(event => event.status === "live" || event.status === "upcoming").sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || a.startsAt - b.startsAt).slice(0, 4);

  return <>
    <p className="admin-lede">The programme, official results, and publication queue at a glance.</p>
    <div className="admin-actions">
      <Link className="button" href="/admin/events">Create an event</Link>
      <Link className="button secondary" href="/admin/gallery">Review photos</Link>
      <Link className="button secondary" href="/admin/scoreboard">Open scoreboard</Link>
    </div>

    <section className="admin-stats" aria-label="Workspace summary">
      <Link className="admin-stat" href="/admin/schools"><span>Schools</span><strong>{activeSchools}</strong><small>{schools.length - activeSchools} archived</small></Link>
      <Link className="admin-stat" href="/admin/events"><span>Events</span><strong>{events.length}</strong><small>{live.length} live now</small></Link>
      <Link className="admin-stat" href="/admin/events"><span>Result drafts</span><strong>{drafts.length}</strong><small>{drafts.length ? "Awaiting publication" : "All clear"}</small></Link>
      <Link className="admin-stat" href="/admin/gallery"><span>Photos</span><strong>{gallery.total}</strong><small>{gallery.pending} awaiting review</small></Link>
    </section>

    <div className="admin-dashboard-grid">
      <section className="admin-panel" aria-labelledby="attention-title">
        <header className="admin-panel-heading"><h2 id="attention-title">Needs attention</h2><span className="small">{drafts.length + gallery.pending} items</span></header>
        {drafts.slice(0, 4).map(event => <Link className="admin-list-row" key={event._id} href={`/admin/events/${event._id}/results`}>
          <span><strong>{event.title}</strong><small>{event.categoryName} · private draft</small></span>
          <span className="pill" data-status="draft">Draft</span>
        </Link>)}
        {gallery.pending > 0 && <Link className="admin-list-row" href="/admin/gallery"><span><strong>{gallery.pending} {gallery.pending === 1 ? "photo needs" : "photos need"} consent review</strong><small>Nothing is public until approved.</small></span><span className="pill" data-status="draft">Review</span></Link>}
        {!drafts.length && !gallery.pending && <p className="admin-empty">Nothing is waiting. Drafts and unreviewed photos will appear here.</p>}
      </section>

      <section className="admin-panel" aria-labelledby="programme-title">
        <header className="admin-panel-heading"><h2 id="programme-title">Live &amp; next</h2><Link className="text-link" href="/admin/events">All events</Link></header>
        {next.map(event => <Link className="admin-list-row" key={event._id} href={`/admin/events/${event._id}/results`}>
          <span><strong>{event.title}</strong><small>{eventDate(event.startsAt)} IST</small></span>
          <span className="pill" data-status={event.status}>{statusLabel(event.status)}</span>
        </Link>)}
        {!next.length && <p className="admin-empty">No live or upcoming events. Create the first event to start the programme.</p>}
      </section>

      <section className="admin-panel admin-panel-wide" aria-labelledby="recent-photos-title">
        <header className="admin-panel-heading"><h2 id="recent-photos-title">Recently added photos</h2><Link className="text-link" href="/admin/gallery">Gallery manager</Link></header>
        {gallery.recent.length ? <div className="admin-photo-list">{gallery.recent.map(item => <Link className="admin-photo-row" key={item._id} href="/admin/gallery">
          <span className="admin-photo-thumb">{item.previewable ? <GalleryPhoto id={item._id} alt={item.altText} preview /> : <span className="admin-photo-placeholder">No preview</span>}</span>
          <span><strong>{item.filename ?? item.altText}</strong><small>Added {new Date(item.createdAt).toLocaleDateString("en-IN", { dateStyle: "medium" })}</small></span>
          <span className="pill" data-status={item.approvalStatus === "draft" ? "draft" : item.approvalStatus}>{item.approvalStatus}</span>
        </Link>)}</div> : <p className="admin-empty">No photos yet. Add them to the shared Drive gallery and they will appear here after the next sync.</p>}
      </section>
    </div>
  </>;
}
