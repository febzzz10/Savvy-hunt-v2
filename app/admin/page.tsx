"use client";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Load, ref } from "@/components/data";
type Event = { _id: string; title: string; status: string; resultStatus: string };
export default function Page() { return <><h1>Event control</h1><Load>{edition => <Overview editionId={edition._id} />}</Load></>; }
function Overview({ editionId }: { editionId: string }) {
  const schools = useQuery(ref<{ editionId: string }, Array<{ _id: string }>>("schools:listAdmin"), { editionId });
  const events = useQuery(ref<{ editionId: string }, Event[]>("events:listAdmin"), { editionId });
  return <><div className="data-strip"><div><strong>{schools?.length ?? "…"}</strong><p>Schools</p></div><div><strong>{events?.filter(event => event.status === "live").length ?? "…"}</strong><p>Live events</p></div><div><strong>{events?.filter(event => event.resultStatus === "draft").length ?? "…"}</strong><p>Result drafts</p></div></div><h2>Live events</h2>{events?.filter(event => event.status === "live").map(event => <Link key={event._id} className="card" href={`/admin/events/${event._id}/results`}>{event.title} → Manage results</Link>)}{events && !events.some(event => event.status === "live") && <p>No events are live.</p>}<div className="grid"><Link className="card" href="/admin/schools"><h2>Schools →</h2></Link><Link className="card" href="/admin/events"><h2>Events and results →</h2></Link><Link className="card" href="/admin/announcements"><h2>Announcements →</h2></Link><Link className="card" href="/admin/gallery"><h2>Gallery →</h2></Link></div></>;
}
