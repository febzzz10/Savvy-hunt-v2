"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Load, ref } from "./data";
import { GalleryPhoto } from "./gallery-photo";
import { Programme, Rankings, SectionHeading, dateLabel, timeLabel, type ProgrammeEvent, type Standing } from "./editorial";
import { EmptyState, Icon, Skeleton } from "./ui";
type Announcement = { _id: string; title: string; body: string; publishedAt?: number };
type Photo = { _id: string; altText: string; caption?: string };
type Result = { eventId: string; eventTitle: string; eventSlug: string; publishedAt: number };
function HomeHero({ title, tagline, photo }: { title?: string; tagline?: string; photo?: Photo }) {
  return <section className="masthead" aria-label="Savvy Hunt event overview">
    <div className="masthead-copy"><span className="eyebrow">Savvy Hunt · Official event hub</span><h1>{title || "Savvy Hunt"}</h1><p>{tagline || "Events, school standings and official results — all in one place."}</p><div className="hero-actions"><Link className="button" href="/scoreboard">View scoreboard <Icon name="arrow" /></Link><Link className="text-link" href="/schedule">Explore the schedule <Icon name="arrow" /></Link></div></div>
    <div className="hero-visual">{photo ? <><GalleryPhoto key={photo._id} id={photo._id} alt={photo.altText} eager />{photo.caption && <div className="hero-caption">{photo.caption}</div>}</> : <div className="hero-type"><span className="wordmark" aria-hidden="true">SH</span><p>A place for talent.<br /><em>A moment to shine.</em></p><span className="small">The school event, together.<br />Follow the programme. Celebrate every achievement.</span></div>}</div>
  </section>;
}
export function HomeContent() { return <Load fallback={<><HomeHero /><Skeleton label="Connecting to live event data…" /></>}>{edition => <HomeData editionId={edition._id} />}</Load>; }
function HomeData({ editionId }: { editionId: string }) {
  const settings = useQuery(ref<{ editionId: string }, { eventTitle: string; tagline?: string } | null>("siteSettings:getPublic"), { editionId });
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
  const hero = photos?.[0];
  return <>
    <HomeHero title={settings?.eventTitle} tagline={settings?.tagline} photo={hero} />
    <nav className="quick-access" aria-label="Event at a glance">
      <Link href="/schedule"><Icon name="clock" /><strong>Live now</strong><span>{live === undefined ? "Checking event status…" : live.length ? live.map(event => event.title).join(" · ") : "No event is live right now"}</span></Link>
      <Link href={next ? `/events/${next.slug}` : "/schedule"}><Icon name="calendar" /><strong>Next up</strong><span>{events === undefined ? "Loading the programme…" : next ? `${dateLabel(next.startsAt)} · ${timeLabel(next.startsAt)} IST` : "Schedule to be announced"}</span></Link>
      <Link href="/results"><Icon name="trophy" /><strong>Latest results</strong><span>{results === undefined ? "Checking official results…" : results[0]?.eventTitle || "Official results pending"}</span></Link>
    </nav>
    <div className="home-features">
      <section><SectionHeading number="Standings" title="Leading schools" /><p className="small">Overall standings · Official points</p>{leaders === undefined || events === undefined ? <Skeleton label="Loading official standings…" /> : hasPublished && leaders.length ? <Rankings rows={leaders} preview /> : <EmptyState title="Every point has its moment" icon="trophy">The leaderboard will appear when official points are published.</EmptyState>}<Link className="text-link" href="/scoreboard">View full scoreboard <Icon name="arrow" /></Link></section>
      <section><SectionHeading number="Programme" title="Coming up next" />{events === undefined ? <Skeleton /> : next ? <Link className="next-event" href={`/events/${next.slug}`}><span className="pill" data-status={next.status}>{next.status}</span><h3>{next.title}</h3><p>{categories?.find(category => category._id === next.categoryId)?.name}</p><div className="date-block"><Icon name="calendar" /><span>{dateLabel(next.startsAt)}<br />{timeLabel(next.startsAt)} IST</span></div><p><Icon name="pin" /> {next.venue || "Venue to be announced"}</p><span className="text-link">Event details <Icon name="arrow" /></span></Link> : <EmptyState title="More to look forward to" href="/schedule">The next programme will appear here when scheduled.</EmptyState>}</section>
      <section><SectionHeading number="Photo diary" title="Snapshots" />{photos === undefined ? <Skeleton label="Loading approved photographs…" /> : photos.length ? <div className="mini-gallery">{photos.slice(0, 4).map(photo => <Link href="/snapshots" key={photo._id}><GalleryPhoto id={photo._id} alt={photo.altText} /></Link>)}</div> : <EmptyState title="Memories in the making" icon="camera">Photos will appear here after they are approved.</EmptyState>}<Link className="text-link" href="/snapshots">Explore the gallery <Icon name="arrow" /></Link></section>
    </div>
    {!!live?.length && <section><SectionHeading number="In progress" title="Happening now" href="/schedule" action="Full schedule" /><Programme events={live} categories={categories} /></section>}
    <div className={announcements?.length ? "editorial-columns" : ""}>
      <section><SectionHeading number="From the results desk" title="The latest achievements" href="/results" action="All results" />{results === undefined ? <Skeleton label="Loading official results…" /> : results.length ? results.map(result => <Link className="result-link" href={`/events/${result.eventSlug}`} key={result.eventId}><span className="pill" data-status="published">Official · Published</span><h3>{result.eventTitle} ↗</h3><span className="small">{dateLabel(result.publishedAt)} · {timeLabel(result.publishedAt)} IST</span></Link>) : <EmptyState title="The results desk is ready" icon="trophy" href="/schedule">Official results will appear here once published.</EmptyState>}</section>
      {!!announcements?.length && <section><SectionHeading number="From the organizers" title="Notice board" />{announcements.slice(0, 3).map(item => <article className="notice" key={item._id}>{item.publishedAt && <span className="eyebrow">{dateLabel(item.publishedAt)}</span>}<h3>{item.title}</h3><p>{item.body}</p></article>)}</section>}
    </div>
  </>;
}
