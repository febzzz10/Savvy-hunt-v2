"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Load, ref } from "@/components/data";
import { GalleryPhoto } from "@/components/gallery-photo";
import { Icon, Skeleton } from "@/components/ui";
import { AdminPageHeader, photoStatus } from "@/components/admin/admin-ui";
import { statusLabel, type EventRecord } from "@/components/admin/events/shared";

type GallerySummary = {
  total: number;
  pending: number;
  recent: Array<{ _id: string; altText: string; filename?: string; approvalStatus: string; availability?: "present" | "missing"; createdAt: number; previewable: boolean }>;
};
type School = { _id: string };

export default function Page() {
  return <>
    <AdminPageHeader title="Overview" description="What is live, what needs publishing, and what is waiting for review in this edition." actions={<>
      <Link className="button" href="/admin/events">Create an event</Link>
      <Link className="button secondary" href="/admin/announcements">New announcement</Link>
      <Link className="button secondary" href="/admin/gallery">Review photos</Link>
      <Link className="button secondary" href="/admin/scoreboard">Open scoreboard</Link>
    </>} />
    <Load>{edition => <Overview editionId={edition._id} />}</Load>
  </>;
}

function Overview({ editionId }: { editionId: string }) {
  const schools = useQuery(ref<{ editionId: string }, School[]>("schools:listAdmin"), { editionId });
  const events = useQuery(ref<{ editionId: string }, EventRecord[]>("events:listAdmin"), { editionId });
  const gallery = useQuery(ref<{ editionId: string }, GallerySummary>("dashboard:gallerySummary"), { editionId });

  if (!schools || !events || !gallery) return <Skeleton label="Loading the organizer overview…" />;

  const live = events.filter(event => event.status === "live");
  const upcoming = events.filter(event => event.status === "upcoming");
  const drafts = events.filter(event => event.hasDraftResults).sort((a, b) => b.updatedAt - a.updatedAt);
  const next = events.filter(event => event.status === "live" || event.status === "upcoming").sort((a, b) => Number(b.status === "live") - Number(a.status === "live") || a.createdAt - b.createdAt).slice(0, 4);

  const attention = drafts.length + gallery.pending;

  return <>
    <section className="admin-stats" aria-label="Workspace summary">
      <Link className="admin-stat" href="/admin/schools"><span>Schools</span><strong>{schools.length}</strong><small>Taking part this edition</small></Link>
      <Link className="admin-stat" href="/admin/events"><span>Events</span><strong>{events.length}</strong><small>{live.length} live · {upcoming.length} upcoming</small></Link>
      <Link className="admin-stat" href="/admin/events" data-attention={drafts.length > 0 || undefined}><span>Results to publish</span><strong>{drafts.length}</strong><small>{drafts.length ? "Private drafts waiting" : "Nothing waiting"}</small></Link>
      <Link className="admin-stat" href="/admin/gallery" data-attention={gallery.pending > 0 || undefined}><span>Photos to review</span><strong>{gallery.pending}</strong><small>{gallery.total} in the photo library</small></Link>
    </section>

    <div className="admin-dashboard-grid">
      <section className="admin-panel" aria-labelledby="attention-title">
        <header className="admin-panel-heading"><h2 id="attention-title">Needs attention</h2><span className="admin-count" aria-label={`${attention} items`}>{attention}</span></header>
        {drafts.slice(0, 4).map(event => <Link className="admin-list-row" key={event._id} href={`/admin/events/${event._id}/results`}>
          <span><strong>{event.title}</strong><small>{event.categoryName} · Draft results are not public yet</small></span>
          <span className="admin-row-action">Review results <Icon name="arrow" /></span>
        </Link>)}
        {drafts.length > 4 && <Link className="admin-more" href="/admin/events">{drafts.length - 4} more {drafts.length - 4 === 1 ? "event has" : "events have"} unpublished drafts <Icon name="arrow" /></Link>}
        {gallery.pending > 0 && <Link className="admin-list-row" href="/admin/gallery"><span><strong>{gallery.pending} {gallery.pending === 1 ? "photo needs" : "photos need"} consent review</strong><small>Nothing is public until consent is confirmed.</small></span><span className="admin-row-action">Review photos <Icon name="arrow" /></span></Link>}
        {!drafts.length && !gallery.pending && <p className="admin-empty">You are all caught up. Unpublished result drafts and photos awaiting review will appear here.</p>}
      </section>

      <section className="admin-panel" aria-labelledby="programme-title">
        <header className="admin-panel-heading"><h2 id="programme-title">Live &amp; next</h2><Link className="text-link" href="/admin/events">All events <Icon name="arrow" /></Link></header>
        {next.map(event => <Link className="admin-list-row" key={event._id} href={`/admin/events/${event._id}/results`}>
          <span><strong>{event.title}</strong><small>{event.categoryName}</small></span>
          <span className="pill" data-status={event.status}>{statusLabel(event.status)}</span>
        </Link>)}
        {!next.length && <p className="admin-empty">No live or upcoming events. <Link className="text-link" href="/admin/events">Create an event</Link></p>}
      </section>

      <section className="admin-panel admin-panel-wide" aria-labelledby="recent-photos-title">
        <header className="admin-panel-heading"><h2 id="recent-photos-title">Recently added photos</h2><Link className="text-link" href="/admin/gallery">Gallery manager <Icon name="arrow" /></Link></header>
        {gallery.recent.length ? <div className="admin-photo-list">{gallery.recent.map(item => <Link className="admin-photo-row" key={item._id} href="/admin/gallery">
          <span className="admin-photo-thumb">{item.previewable ? <GalleryPhoto id={item._id} alt={item.altText} preview /> : <span className="admin-photo-placeholder">No preview</span>}</span>
          <span><strong>{item.filename ?? item.altText}</strong><small>{item.availability === "missing" ? "Missing from Drive · " : ""}Added {new Date(item.createdAt).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium" })}</small></span>
          <span className="pill" data-status={photoStatus(item.approvalStatus).status}>{photoStatus(item.approvalStatus).label}</span>
        </Link>)}</div> : <p className="admin-empty">No photos yet. Add them to the shared Google Drive gallery folder; they appear here after the next sync (every 2 minutes).</p>}
      </section>
    </div>
  </>;
}
