"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Load, ref } from "./data";
import { GalleryPhoto } from "./gallery-photo";
type School = { id: string; name: string; points: number; rank: number };
type Event = { _id: string; title: string; slug: string; status: string; startsAt: number; hasPublishedResults: boolean };
type Announcement = { _id: string; title: string; body: string; publishedAt?: number };
type Photo = { _id: string; altText: string; caption?: string };
type Settings = { eventTitle: string; tagline?: string } | null;

export function HomeContent() { return <Load>{edition => <HomeData editionId={edition._id} />}</Load>; }
function HomeData({ editionId }: { editionId: string }) {
  const settings = useQuery(ref<{ editionId: string }, Settings>("siteSettings:getPublic"), { editionId });
  const standings = useQuery(ref<{ editionId: string }, School[]>("scoreboard:getOverall"), { editionId });
  const events = useQuery(ref<{ editionId: string }, Event[]>("events:listPublic"), { editionId });
  const announcements = useQuery(ref<{ editionId: string }, Announcement[]>("announcements:listPublic"), { editionId });
  const photos = useQuery(ref<{ editionId: string }, Photo[]>("gallery:listApproved"), { editionId });
  const live = events?.filter(event => event.status === "live") ?? [];
  const upcoming = events?.filter(event => event.status === "upcoming").slice(0, 3) ?? [];
  const published = events?.filter(event => event.hasPublishedResults).slice(-3).reverse() ?? [];
  return <>
    <section className="hero"><p>THE SCHOOL EVENT, LIVE</p><h1>{settings?.eventTitle || "Savvy Hunt"}</h1><p>{settings?.tagline || "Follow every event, official result, and school standing as it happens."}</p><Link className="button" href="/scoreboard">View live scoreboard</Link></section>
    <section><h2>Live now</h2>{live.length ? <div className="grid">{live.map(event => <Link className="card" key={event._id} href={`/events/${event.slug}`}><span className="pill">Live</span><h3>{event.title}</h3></Link>)}</div> : <p className="muted">No event is live right now.</p>}</section>
    <section><h2>Announcements</h2>{announcements === undefined ? <p>Loading updates…</p> : announcements.length ? <div className="grid">{announcements.slice(0, 3).map(item => <article className="card" key={item._id}><h3>{item.title}</h3><p>{item.body}</p></article>)}</div> : <p className="muted">No announcements yet.</p>}</section>
    <section><h2>Who’s leading?</h2>{standings === undefined ? <p>Loading official standings…</p> : standings.some(school => school.points > 0) ? <div className="grid">{standings.slice(0, 3).map(school => <div className="card" key={school.id}><span className="pill">Rank {school.rank}</span><h3>{school.name}</h3><strong>{school.points} points</strong></div>)}</div> : <p className="muted">Leaders will appear when official results are published.</p>}<p><Link href="/scoreboard">See all standings →</Link></p></section>
    <section><h2>Upcoming events</h2>{upcoming.length ? <div className="grid">{upcoming.map(event => <Link className="card" key={event._id} href={`/events/${event.slug}`}><h3>{event.title}</h3><p>{new Date(event.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p></Link>)}</div> : <p className="muted">No upcoming events scheduled.</p>}<p><Link href="/schedule">Full schedule →</Link></p></section>
    <section><h2>Recent official results</h2>{published.length ? <div className="grid">{published.map(event => <Link className="card" key={event._id} href={`/events/${event.slug}`}><h3>{event.title}</h3><span className="pill">Official result</span></Link>)}</div> : <p className="muted">Official results will appear after publication.</p>}<p><Link href="/results">All results →</Link></p></section>
    <section><h2>Snapshots</h2>{photos?.length ? <div className="grid">{photos.slice(0, 3).map(photo => <Link className="card" href="/snapshots" key={photo._id}><GalleryPhoto id={photo._id} alt={photo.altText} /><p>{photo.caption ?? photo.altText}</p></Link>)}</div> : <p className="muted">Approved event photos will appear here.</p>}</section>
  </>;
}
