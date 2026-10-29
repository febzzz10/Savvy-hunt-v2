"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Nav } from "@/components/public";
import { Load, ref } from "@/components/data";
import { EmptyState, Skeleton } from "@/components/ui";
import { dateLabel, timeLabel } from "@/components/editorial";
type Result = { eventId: string; eventTitle: string; eventSlug: string; categoryId: string; publishedAt: number; entries: Array<{ schoolId: string; schoolName: string; points: number; placement?: number; entryLabel?: string }> };
type Category = { _id: string; name: string };
type School = { _id: string; name: string };
export default function Page() { return <><Nav /><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">The results desk</span><h1>Official results</h1><p className="muted">Published results and final placements for each event.</p><Load>{edition => <Results editionId={edition._id} />}</Load></main></>; }
function Results({ editionId }: { editionId: string }) {
  const results = useQuery(ref<{ editionId: string; limit: number }, Result[]>("results:listRecentPublished"), { editionId, limit: 50 });
  const categories = useQuery(ref<{ editionId: string }, Category[]>("categories:listCurrent"), { editionId });
  const schools = useQuery(ref<{ editionId: string }, School[]>("schools:listActive"), { editionId });
  const [categoryId, setCategory] = useState("all"), [schoolId, setSchool] = useState("all");
  const filtered = results?.filter(result => (categoryId === "all" || result.categoryId === categoryId) && (schoolId === "all" || result.entries.some(entry => entry.schoolId === schoolId)));
  const isFiltered = categoryId !== "all" || schoolId !== "all";
  return <><div className="grid filters"><label className="field"><span>Category</span><select aria-label="Category" value={categoryId} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories?.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label className="field"><span>School</span><select aria-label="School" value={schoolId} onChange={event => setSchool(event.target.value)}><option value="all">All schools</option>{schools?.map(school => <option key={school._id} value={school._id}>{school.name}</option>)}</select></label></div>
    {isFiltered && <div className="filter-summary"><span role="status">{filtered?.length ?? "…"} published event results</span><button className="button secondary" onClick={() => { setCategory("all"); setSchool("all"); }}>Clear filters</button></div>}
    {filtered === undefined ? <Skeleton label="Loading official results…" /> : filtered.length ? filtered.map(result => <article className="result-sheet" key={result.eventId}><header><span className="pill" data-status="published">Official · Published</span><h2><Link href={`/events/${result.eventSlug}`}>{result.eventTitle} ↗</Link></h2><p>{categories?.find(category => category._id === result.categoryId)?.name}</p><p>Published {dateLabel(result.publishedAt)} · {timeLabel(result.publishedAt)} IST</p></header><div className="table-wrap"><table><caption className="sr-only">Official placements for {result.eventTitle}</caption><thead><tr><th scope="col">School / entry</th><th scope="col">Placement</th><th scope="col">Points</th></tr></thead><tbody>{result.entries.filter(entry => schoolId === "all" || entry.schoolId === schoolId).map((entry, index) => <tr key={index}><th scope="row">{entry.schoolName}{entry.entryLabel && <div className="small">{entry.entryLabel}</div>}</th><td>{entry.placement ?? "—"}</td><td className="points">{entry.points}</td></tr>)}</tbody></table></div></article>) : <EmptyState title={results?.length ? "No results match these filters" : "No official results published yet"} icon="trophy" href={results?.length ? undefined : "/schedule"}>{results?.length ? "Clear the filters to see all published results." : "Official results will appear here once published. Explore the schedule to see what's coming up."}</EmptyState>}
    {results?.length === 50 && <p className="small">Showing the latest 50 published event results. Earlier results remain available on their event pages in the <Link href="/schedule">schedule</Link>.</p>}
  </>;
}
