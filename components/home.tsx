"use client";
import Link from "next/link";
import { AchievementCards } from "./home/achievement-card";
import type { AchievementResult } from "../lib/achievement-results";
import { EventUpdates } from "./home/event-updates";
import { SchoolPodium } from "./home/school-podium";
import { MobileUpdates } from "./home/mobile-updates";
import { HeroSection } from "./home/hero-section";
import "./home-sections.css";
import { useQuery } from "convex/react";
import { Load, ref } from "./data";
import { GalleryPhoto } from "./gallery-photo";
import { Programme, SectionHeading, dateLabel, timeLabel, type ProgrammeEvent, type Standing } from "./editorial";
import { EmptyState, Icon, Skeleton } from "./ui";
type Announcement = { _id: string; title: string; body: string; publishedAt?: number };
type Photo = { _id: string; altText: string; caption?: string };

export function HomeContent() { return <Load fallback={<><HeroSection /><Skeleton label="Connecting to live event dataâ€¦" /></>}>{edition => <HomeData editionId={edition._id} />}</Load>; }
function HomeData({ editionId }: { editionId: string }) {
  const standings = useQuery(ref<{ editionId: string }, Standing[]>("scoreboard:getOverall"), { editionId });
  const events = useQuery(ref<{ editionId: string }, ProgrammeEvent[]>("events:listPublic"), { editionId });
  const categories = useQuery(ref<{ editionId: string }, { _id: string; name: string }[]>("categories:listCurrent"), { editionId });
  const announcements = useQuery(ref<{ editionId: string }, Announcement[]>("announcements:listPublic"), { editionId });
  const photos = useQuery(ref<{ editionId: string }, Photo[]>("gallery:listApproved"), { editionId });
  const results = useQuery(ref<{ editionId: string; limit: number }, AchievementResult[]>("results:listRecentPublished"), { editionId, limit: 6 });
  const live = events?.filter(event => event.status === "live");
  const next = events?.find(event => event.status === "upcoming");
  const leaders = standings?.filter(row => row.points > 0);
  const hasPublished = events?.some(event => event.hasPublishedResults);

  return <>
    <HeroSection />
    <nav className="quick-access" aria-label="Event at a glance">
      <Link href="/schedule"><Icon name="clock" /><strong>Live now</strong><span>{live === undefined ? "Checking event statusâ€¦" : live.length ? live.map(event => event.title).join(" Â· ") : "No event is live right now"}</span></Link>
      <Link href={next ? `/events/${next.slug}` : "/schedule"}><Icon name="calendar" /><strong>Next up</strong><span>{events === undefined ? "Loading the programmeâ€¦" : next ? `${dateLabel(next.startsAt)} Â· ${timeLabel(next.startsAt)} IST` : "Schedule to be announced"}</span></Link>
      <Link href="/results"><Icon name="trophy" /><strong>Latest results</strong><span>{results === undefined ? "Checking official resultsâ€¦" : results[0]?.eventTitle || "Official results pending"}</span></Link>
    </nav>
    <MobileUpdates events={events} results={results} categories={categories} />
    <div className="home-sections">
      <section className="home-leading" aria-labelledby="home-leading-title">
        <header className="school-standings-heading"><div><span className="eyebrow">School Standings</span><h2 id="home-leading-title">Leading Schools</h2></div><Link className="school-scoreboard-link" href="/scoreboard" aria-label="View Full Scoreboard"><Icon name="arrow" /></Link></header>
        {leaders === undefined || events === undefined ? <Skeleton label="Loading official standings..." /> : hasPublished && leaders.length ? <SchoolPodium rows={leaders} /> : <EmptyState title="Every point has its moment" icon="trophy">The leaderboard will appear when official points are published.</EmptyState>}
        <div className="home-section-action school-scoreboard-action"><Link className="button secondary home-editorial-cta" href="/scoreboard">View Full Scoreboard <Icon name="arrow" /></Link></div>
      </section>
      <EventUpdates events={events} categories={categories} />
      <section className="home-snapshots" aria-labelledby="home-snapshots-title">
        <header className="home-section-heading"><h2 id="home-snapshots-title">Snapshots</h2><p className="muted">Event moments, shared through approved photographs.</p></header>
        {photos === undefined ? <Skeleton label="Loading approved photographs..." /> : photos.length ? <div className="home-photo-grid">{photos.slice(0, 3).map(photo => <figure key={photo._id}><Link href="/snapshots"><GalleryPhoto id={photo._id} alt={photo.altText} /></Link>{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure>)}</div> : <EmptyState title="Memories in the making" icon="camera">Photos will appear here after they are approved.</EmptyState>}
        <div className="home-section-action"><Link className="button secondary" href="/snapshots">Open Gallery <Icon name="arrow" /></Link></div>
      </section>
    </div>
    {!!live?.length && <section><SectionHeading number="In progress" title="Happening now" href="/schedule" action="Full schedule" /><Programme events={live} categories={categories} /></section>}
    <div className={announcements?.length ? "editorial-columns" : ""}>
      <section><SectionHeading number="From the results desk" title="The latest achievements" />{results === undefined ? <Skeleton label="Loading official results…" /> : results.length ? <AchievementCards results={results} categories={categories} /> : <EmptyState title="The results desk is ready" icon="trophy" href="/schedule">Official results will appear here once published.</EmptyState>}<div className="home-section-action home-results-action"><Link className="button secondary home-editorial-cta" href="/results">View All Results <Icon name="arrow" /></Link></div></section>
      {!!announcements?.length && <section><SectionHeading number="From the organizers" title="Notice board" />{announcements.slice(0, 3).map(item => <article className="notice" key={item._id}>{item.publishedAt && <span className="eyebrow">{dateLabel(item.publishedAt)}</span>}<h3>{item.title}</h3><p>{item.body}</p></article>)}</section>}
    </div>
  </>;
}
