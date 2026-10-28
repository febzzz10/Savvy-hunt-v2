"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Nav } from "@/components/public";
import { Load, ref } from "@/components/data";
type Result = { eventId: string; eventTitle: string; eventSlug: string; categoryId: string; publishedAt: number; entries: Array<{ schoolId: string; schoolName: string; points: number; placement?: number; entryLabel?: string }> };
type Category = { _id: string; name: string };
type School = { _id: string; name: string };
export default function Page() { return <><Nav /><main className="shell"><h1>Official results</h1><Load>{edition => <Results editionId={edition._id} />}</Load></main></>; }
function Results({ editionId }: { editionId: string }) {
  const results = useQuery(ref<{ editionId: string; limit: number }, Result[]>("results:listRecentPublished"), { editionId, limit: 50 });
  const categories = useQuery(ref<{ editionId: string }, Category[]>("categories:listCurrent"), { editionId });
  const schools = useQuery(ref<{ editionId: string }, School[]>("schools:listActive"), { editionId });
  const [categoryId, setCategory] = useState("all"), [schoolId, setSchool] = useState("all");
  const filtered = results?.filter(result => (categoryId === "all" || result.categoryId === categoryId) && (schoolId === "all" || result.entries.some(entry => entry.schoolId === schoolId)));
  return <><div className="grid filters"><label className="field"><span>Category</span><select value={categoryId} onChange={event => setCategory(event.target.value)}><option value="all">All categories</option>{categories?.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label><label className="field"><span>School</span><select value={schoolId} onChange={event => setSchool(event.target.value)}><option value="all">All schools</option>{schools?.map(school => <option key={school._id} value={school._id}>{school.name}</option>)}</select></label></div>{filtered === undefined ? <p>Loading official results…</p> : filtered.length ? filtered.map(result => <article className="card" key={result.eventId}><span className="pill">Official</span><h2><Link href={`/events/${result.eventSlug}`}>{result.eventTitle}</Link></h2><p>{categories?.find(category => category._id === result.categoryId)?.name} · {new Date(result.publishedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })}</p><div className="table-wrap"><table><thead><tr><th scope="col">School</th><th scope="col">Placement</th><th scope="col">Points</th></tr></thead><tbody>{result.entries.filter(entry => schoolId === "all" || entry.schoolId === schoolId).map((entry, index) => <tr key={index}><td>{entry.schoolName}</td><td>{entry.placement ?? "—"}</td><td>{entry.points}</td></tr>)}</tbody></table></div></article>) : <p>No published results match these filters.</p>}</>;
}
