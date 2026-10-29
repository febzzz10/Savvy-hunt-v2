"use client";
import Link from "next/link";
import { HeroSection } from "./home/hero-section";
import "./home-sections.css";
import { useQuery } from "convex/react";
import { Load, ref } from "./data";
import { GalleryPhoto } from "./gallery-photo";
import { Programme, Rankings, SectionHeading, dateLabel, timeLabel, type ProgrammeEvent, type Standing } from "./editorial";
import { EmptyState, Icon, Skeleton } from "./ui";
type Announcement = { _id: string; title: string; body: string; publishedAt?: number };
type Photo = { _id: string; altText: string; caption?: string };
type Result = { eventId: string; eventTitle: string; eventSlug: string; publishedAt: number };
export function HomeContent() { return <Load fallback={<><HeroSection /><Skeleton label="Connecting to live event dataâ€¦" /></>}>{edition => <HomeData editionId={edition._id} />}</Load>; }
function HomeData({ editionId }: { editionId: string }) {
  const standings = useQuery(ref<{ editionId: string }, Standing[]>("scoreboard:getOverall"), { editionId });
  const events = useQuery(ref<{ editionId: string }, ProgrammeEvent[]>("events:listPublic"), { editionId });
  const categories = useQuery(ref<{ editionId: string }, { _id: string; name: string }[]>("categories:listCurrent"), { editionId });
  const announcements = useQuery(ref<{ editionId: string }, Announcement[]>("announcements:listPublic"), { editionId });
  const photos = useQuery(ref<{ editionId: string }, Photo[]>("gallery:listApproved"), { editionId });
  const results = useQuery(ref<{ editionId: string; limit: number }, Result[]>("results:listRecentPublished"), { editionId, limit: 3 });
  const live = events?.filter(event => event.status === "live");
  const next = events?.find(event => event.status === "upcoming");
  const leaders = standings?.filter(row => row.points > 0);
  const hasPublished = events?.some(event => event.hasPublishedResults);

  const updates = events?.filter(event => event.status === "live" || event.status === "upcoming" || event.hasPublishedResults)
    .map((event, index) => ({ event, index, priority: event.status === "live" ? 0 : event.status === "upcoming" ? 1 : 2 }))
    .sort((a, b) => a.priority - b.priority || a.index - b.index).slice(0, 3).map(item => item.event);
  return <>
    <HeroSection />
    <nav className="quick-access" aria-label="Event at a glance">
      <Link href="/schedule"><Icon name="clock" /><strong>Live now</strong><span>{live === undefined ? "Checking event statusâ€¦" : live.length ? live.map(event => event.title).join(" Â· ") : "No event is live right now"}</span></Link>
      <Link href={next ? `/events/${next.slug}` : "/schedule"}><Icon name="calendar" /><strong>Next up</strong><span>{events === undefined ? "Loading the programmeâ€¦" : next ? `${dateLabel(next.startsAt)} Â· ${timeLabel(next.startsAt)} IST` : "Schedule to be announced"}</span></Link>
      <Link href="/results"><Icon name="trophy" /><strong>Latest results</strong><span>{results === undefined ? "Checking official resultsâ€¦" : results[0]?.eventTitle || "Official results pending"}</span></Link>
    </nav>
    <div className="home-sections">
      <section className="home-updates" aria-labelledby="home-updates-title">
        <h2 id="home-updates-title">Real-Time Updates</h2>
        {updates === undefined ? <Skeleton label="Loading event updates..." /> : updates.length ? <><div className="home-update-grid">{updates.map(event => <article className="card home-update-card" key={event._id}>
          <div className="home-update-status"><span className="pill" data-status={event.status === "live" ? "live" : event.status === "upcoming" ? "upcoming" : "published"}>{event.status === "live" ? "Live Now" : event.status === "upcoming" ? "Upcoming" : "Results Published"}</span>{event.hasPublishedResults && (event.status === "live" || event.status === "upcoming") && <span className="pill" data-status="published">Results Published</span>}</div>
          <h3>{event.title}</h3><p className="small">{categories?.find(category => category._id === event.categoryId)?.name}</p>
          <p className="small"><Icon name="calendar" /> {dateLabel(event.startsAt)} / {timeLabel(event.startsAt)} IST</p>
          <p className="small"><Icon name="pin" /> {event.venue || "Venue to be announced"}</p>
          <Link className="text-link" href={`/events/${event.slug}`}>View Details <Icon name="arrow" /></Link>
        </article>)}</div>{updates.length < 3 && <p className="small">More updates will appear as events are scheduled or official results are published.</p>}</> : <EmptyState title="No event updates yet" icon="calendar">Live events, upcoming events and published results will appear here when available.</EmptyState>}
        <div className="home-section-action"><Link className="button secondary" href="/schedule">View Full Schedule <Icon name="arrow" /></Link></div>
      </section>
      <section className="home-leading" aria-labelledby="home-leading-title">
        <header className="home-section-heading"><h2 id="home-leading-title">Who&apos;s Leading?</h2><p className="muted">Overall school standings, based on official points from published event results.</p></header>
        {leaders === undefined || events === undefined ? <Skeleton label="Loading official standings..." /> : hasPublished && leaders.length ? <Rankings rows={leaders} preview /> : <EmptyState title="Every point has its moment" icon="trophy">The leaderboard will appear when official points are published.</EmptyState>}
        <div className="home-section-action"><Link className="button secondary" href="/scoreboard">View Full Scoreboard <Icon name="arrow" /></Link></div>
      </section>
      <section className="home-snapshots" aria-labelledby="home-snapshots-title">
        <header className="home-section-heading"><h2 id="home-snapshots-title">Snapshots</h2><p className="muted">Event moments, shared through approved photographs.</p></header>
        {photos === undefined ? <Skeleton label="Loading approved photographs..." /> : photos.length ? <div className="home-photo-grid">{photos.slice(0, 3).map(photo => <figure key={photo._id}><Link href="/snapshots"><GalleryPhoto id={photo._id} alt={photo.altText} /></Link>{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div> : <EmptyState title="Memories in the making" icon="camera">Photos will appear here after they are approved.</EmptyState>}
        <div className="home-section-action"><Link className="button secondary" href="/snapshots">Open Gallery <Icon name="arrow" /></Link></div>
      </section>
    </div>
    {!!live?.length && <section><SectionHeading number="In progress" title="Happening now" href="/schedule" action="Full schedule" /><Programme events={live} categories={categories} /></section>}
    <div className={announcements?.length ? "editorial-columns" : ""}>
      <section><SectionHeading number="From the results desk" title="The latest achievements" href="/results" action="All results" />{results === undefined ? <Skeleton label="Loading official resultsâ€¦" /> : results.length ? results.map(result => <Link className="result-link" href={`/events/${result.eventSlug}`} key={result.eventId}><span className="pill" data-status="published">Official Â· Published</span><h3>{result.eventTitle} â†—</h3><span className="small">{dateLabel(result.publishedAt)} Â· {timeLabel(result.publishedAt)} IST</span></Link>) : <EmptyState title="The results desk is ready" icon="trophy" href="/schedule">Official results will appear here once published.</EmptyState>}</section>
      {!!announcements?.length && <section><SectionHeading number="From the organizers" title="Notice board" />{announcements.slice(0, 3).map(item => <article className="notice" key={item._id}>{item.publishedAt && <span className="eyebrow">{dateLabel(item.publishedAt)}</span>}<h3>{item.title}</h3><p>{item.body}</p></article>)}</section>}
    </div>
  </>;
}
