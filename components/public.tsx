"use client";
import Link from "next/link";
import { useState } from "react";
import { Programme, Rankings, Podium } from "./editorial";
import { SiteNavigation } from "./site-navigation";
import { EmptyState, Skeleton } from "./ui";
import { useQuery } from "convex/react";
import { ref, Load } from "./data";

type School = { id: string; name: string; points: number; rank: number };
type Category = { _id: string; name: string; slug: string };
type Event = { _id: string; title: string; slug: string; status: string; startsAt: number; venue?: string; categoryId: string; description?: string; hasPublishedResults: boolean };

export function Nav() {
  return <SiteNavigation links={[["/scoreboard", "Scoreboard"], ["/schedule", "Schedule"], ["/results", "Results"], ["/snapshots", "Snapshots"], ["/about", "About"], ["/admin", "Admin"]]} />;
}

export function Board({ slug }: { slug?: string }) { return <Load>{edition => <BoardData editionId={edition._id} slug={slug} />}</Load>; }
function BoardData({ editionId, slug }: { editionId: string; slug?: string }) {
  const categories = useQuery(ref<{ editionId: string }, Category[]>("categories:listCurrent"), { editionId });
  const selected = categories?.find(category => category.slug === slug);
  const overall = useQuery(ref<{ editionId: string }, School[]>("scoreboard:getOverall"), { editionId });
  const category = useQuery(ref<{ editionId: string; categoryId: string }, School[]>("scoreboard:getCategory"), selected ? { editionId, categoryId: selected._id } : "skip");
  const events = useQuery(ref<{ editionId: string }, Event[]>("events:listPublic"), { editionId });
  if (slug && categories && !selected) return <EmptyState title="Category not found" href="/scoreboard" action="View overall standings" />;
  const rows = slug ? category : overall;
  const hasPublished = events?.some(event => (!selected || event.categoryId === selected._id) && event.hasPublishedResults);
  return <><nav className="actions category-tabs" aria-label="Scoreboard categories"><Link className="button secondary" href="/scoreboard" aria-current={!slug ? "page" : undefined}>Overall</Link>{categories?.map(item => <Link className="button secondary" key={item._id} href={`/scoreboard/${item.slug}`} aria-current={slug === item.slug ? "page" : undefined}>{item.name}</Link>)}</nav><h2 className="standings-title">{selected?.name ?? "Overall standings"}</h2>
    {rows === undefined || events === undefined ? <Skeleton label="Loading official standings…" /> : <>{hasPublished && <Podium rows={rows} />}{!hasPublished && <EmptyState title="Official results are on their way" icon="trophy" href="/schedule">Leaders will appear when official points are published.</EmptyState>}{rows.length ? <Rankings rows={rows} /> : <EmptyState title="Participating schools will appear here" href="/schedule">Follow the schedule while the organizers prepare the standings.</EmptyState>}</>}
    {selected && <section><h2>Official {selected.name} event results</h2><div className="grid">{events?.filter(event => event.categoryId === selected._id && event.hasPublishedResults).map(event => <Link className="card" href={`/events/${event.slug}`} key={event._id}><h3>{event.title}</h3><span className="pill">Official result</span></Link>)}</div>{events && !events.some(event => event.categoryId === selected._id && event.hasPublishedResults) && <p>No official results have been published for this category.</p>}</section>}
  </>;
}

export function Schedule({ limit }: { limit?: number }) { return <Load>{edition => <ScheduleData editionId={edition._id} limit={limit} />}</Load>; }
function ScheduleData({ editionId, limit }: { editionId: string; limit?: number }) {
  const events = useQuery(ref<{ editionId: string }, Event[]>("events:listPublic"), { editionId });
  const categories = useQuery(ref<{ editionId: string }, Category[]>("categories:listCurrent"), { editionId });
  const [status, setStatus] = useState("all"), [categoryId, setCategoryId] = useState("all"), [date, setDate] = useState(""), [search, setSearch] = useState("");
  if (events === undefined) return <Skeleton label="Loading schedule…" />;
  const filtered = events.filter(event => (status === "all" || event.status === status) && (categoryId === "all" || event.categoryId === categoryId) && (!date || new Date(event.startsAt).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) === date) && `${event.title} ${event.venue ?? ""} ${categories?.find(item => item._id === event.categoryId)?.name ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <>{!limit && <><div className="grid filters"><label className="field"><span>Search programme</span><input type="search" placeholder="Event, category or venue" value={search} onChange={event => setSearch(event.target.value)} /></label><label className="field"><span>Status</span><select aria-label="Status" value={status} onChange={event => setStatus(event.target.value)}><option value="all">All statuses</option>{["upcoming", "live", "completed", "postponed", "cancelled"].map(item => <option key={item} value={item}>{item}</option>)}</select></label><label className="field"><span>Category</span><select aria-label="Category" value={categoryId} onChange={event => setCategoryId(event.target.value)}><option value="all">All categories</option>{categories?.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label><label className="field"><span>Date</span><input type="date" value={date} onChange={event => setDate(event.target.value)} /></label></div><div className="filter-summary"><span role="status">{filtered.length} event{filtered.length === 1 ? "" : "s"} / All times IST</span><button className="button secondary" onClick={() => { setSearch(""); setDate(""); setStatus("all"); setCategoryId("all"); }}>Clear filters</button></div></>}
    {!filtered.length ? <EmptyState title={events.length ? "No events match your filters" : "The programme is taking shape"} href={events.length ? undefined : "/"} action="Return to the event hub">{events.length ? "Clear the filters to see the full programme." : "The next programme will appear here when scheduled."}</EmptyState> : <Programme events={limit ? filtered.slice(0, limit) : filtered} categories={categories} />}
  </>;
}

export function EventDetail({ slug }: { slug: string }) { return <Load>{edition => <EventDetailData editionId={edition._id} slug={slug} />}</Load>; }
function EventDetailData({ editionId, slug }: { editionId: string; slug: string }) {
  const event = useQuery(ref<{ editionId: string; slug: string }, Event | null>("events:getPublicBySlug"), { editionId, slug });
  const entries = useQuery(ref<{ eventId: string }, Array<{ schoolId: string; schoolName: string; points: number; placement?: number; entryLabel?: string }>>("results:getPublishedByEvent"), event ? { eventId: event._id } : "skip");
  if (event === undefined) return <Skeleton label="Loading event…" />;
  if (!event) return <EmptyState title="Event not found" href="/schedule" />;
  return <><span className="pill">{event.status}</span><h1>{event.title}</h1><p>{new Date(event.startsAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "full", timeStyle: "short" })} · {event.venue ?? "Venue to be announced"}</p>{event.description && <p>{event.description}</p>}<h2>Official results</h2>{!entries?.length ? <p>Results pending.</p> : <div className="table-wrap"><table><thead><tr><th scope="col">School</th><th scope="col">Placement</th><th scope="col">Entry</th><th scope="col">Points</th></tr></thead><tbody>{entries.map((row, index) => <tr key={index}><td>{row.schoolName}</td><td>{row.placement ?? "—"}</td><td>{row.entryLabel ?? "—"}</td><td>{row.points}</td></tr>)}</tbody></table></div>}</>;
}
