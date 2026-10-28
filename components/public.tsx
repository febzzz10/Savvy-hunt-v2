"use client";
import Link from "next/link";
import { useState } from "react";
import { useQuery } from "convex/react";
import { ref, Load } from "./data";

type School = { id: string; name: string; points: number; rank: number };
type Category = { _id: string; name: string; slug: string };
type Event = { _id: string; title: string; slug: string; status: string; startsAt: number; venue?: string; categoryId: string; description?: string; hasPublishedResults: boolean };

export function Nav() { return <nav className="nav" aria-label="Public navigation"><Link className="brand" href="/">SAVVY HUNT</Link><Link href="/scoreboard">Scoreboard</Link><Link href="/schedule">Schedule</Link><Link href="/results">Results</Link><Link href="/snapshots">Snapshots</Link><Link href="/about">About</Link><Link href="/admin">Admin</Link></nav>; }

export function Board({ slug }: { slug?: string }) { return <Load>{edition => <BoardData editionId={edition._id} slug={slug} />}</Load>; }
function BoardData({ editionId, slug }: { editionId: string; slug?: string }) {
  const categories = useQuery(ref<{ editionId: string }, Category[]>("categories:listCurrent"), { editionId });
  const selected = categories?.find(category => category.slug === slug);
  const overall = useQuery(ref<{ editionId: string }, School[]>("scoreboard:getOverall"), { editionId });
  const category = useQuery(ref<{ editionId: string; categoryId: string }, School[]>("scoreboard:getCategory"), selected ? { editionId, categoryId: selected._id } : "skip");
  const events = useQuery(ref<{ editionId: string }, Event[]>("events:listPublic"), { editionId });
  if (slug && categories && !selected) return <p>Category not found.</p>;
  const rows = slug ? category : overall;
  return <><nav className="actions" aria-label="Scoreboard categories"><Link className="button secondary" href="/scoreboard">Overall</Link>{categories?.map(item => <Link className="button secondary" key={item._id} href={`/scoreboard/${item.slug}`}>{item.name}</Link>)}</nav><h2>{selected?.name ?? "Overall standings"}</h2>
    {rows === undefined ? <p>Loading official standings…</p> : !rows.length ? <p>Participating schools will appear here.</p> : <div className="table-wrap"><table><thead><tr><th scope="col">Rank</th><th scope="col">School</th><th scope="col">Official points</th></tr></thead><tbody>{rows.map(school => <tr key={school.id}><td>#{school.rank}</td><td>{school.name}</td><td>{school.points}</td></tr>)}</tbody></table></div>}
    {selected && <section><h2>Official {selected.name} event results</h2><div className="grid">{events?.filter(event => event.categoryId === selected._id && event.hasPublishedResults).map(event => <Link className="card" href={`/events/${event.slug}`} key={event._id}><h3>{event.title}</h3><span className="pill">Official result</span></Link>)}</div>{events && !events.some(event => event.categoryId === selected._id && event.hasPublishedResults) && <p>No official results have been published for this category.</p>}</section>}
  </>;
}

export function Schedule({ limit }: { limit?: number }) { return <Load>{edition => <ScheduleData editionId={edition._id} limit={limit} />}</Load>; }
function ScheduleData({ editionId, limit }: { editionId: string; limit?: number }) {
  const events = useQuery(ref<{ editionId: string }, Event[]>("events:listPublic"), { editionId });
  const categories = useQuery(ref<{ editionId: string }, Category[]>("categories:listCurrent"), { editionId });
  const [status, setStatus] = useState("all"), [categoryId, setCategoryId] = useState("all"), [date, setDate] = useState("");
  if (events === undefined) return <p>Loading schedule…</p>;
  const filtered = events.filter(event => (status === "all" || event.status === status) && (categoryId === "all" || event.categoryId === categoryId) && (!date || new Date(event.startsAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === date));
  return <>{!limit && <div className="grid filters"><label className="field"><span>Status</span><select value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{["upcoming", "live", "completed", "postponed", "cancelled"].map(item => <option key={item} value={item}>{item}</option>)}</select></label><label className="field"><span>Category</span><select value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="all">All categories</option>{categories?.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label className="field"><span>Date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label></div>}
    {!filtered.length ? <p>No events match these filters.</p> : <div className="grid">{(limit ? filtered.slice(0, limit) : filtered).map(event => <Link className="card" href={`/events/${event.slug}`} key={event._id}><span className="pill">{event.status}</span><h3>{event.title}</h3><p>{categories?.find(item => item._id === event.categoryId)?.name}</p><p>{new Date(event.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p><p className="muted">{event.venue ?? "Venue to be announced"}</p>{event.status === "completed" && <p>{event.hasPublishedResults ? "Official results published" : "Results pending"}</p>}</Link>)}</div>}
  </>;
}

export function EventDetail({ slug }: { slug: string }) { return <Load>{edition => <EventDetailData editionId={edition._id} slug={slug} />}</Load>; }
function EventDetailData({ editionId, slug }: { editionId: string; slug: string }) {
  const event = useQuery(ref<{ editionId: string; slug: string }, Event | null>("events:getPublicBySlug"), { editionId, slug });
  const entries = useQuery(ref<{ eventId: string }, Array<{ schoolId: string; schoolName: string; points: number; placement?: number; entryLabel?: string }>>("results:getPublishedByEvent"), event ? { eventId: event._id } : "skip");
  if (event === undefined) return <p>Loading event…</p>;
  if (!event) return <p>Event not found.</p>;
  return <><span className="pill">{event.status}</span><h1>{event.title}</h1><p>{new Date(event.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" })} · {event.venue ?? "Venue to be announced"}</p>{event.description && <p>{event.description}</p>}<h2>Official results</h2>{!entries?.length ? <p>Results pending.</p> : <div className="table-wrap"><table><thead><tr><th scope="col">School</th><th scope="col">Placement</th><th scope="col">Entry</th><th scope="col">Points</th></tr></thead><tbody>{entries.map((row, index) => <tr key={index}><td>{row.schoolName}</td><td>{row.placement ?? "—"}</td><td>{row.entryLabel ?? "—"}</td><td>{row.points}</td></tr>)}</tbody></table></div>}</>;
}
