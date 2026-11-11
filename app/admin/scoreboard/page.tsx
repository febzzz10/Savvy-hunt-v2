"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Load, ref } from "@/components/data";
import "./scoreboard.css";

type Standing = { id: string; name: string; points: number; rank: number };
type Contribution = { eventId: string; eventTitle: string; points: number };
type Category = { _id: string; name: string };

export default function Page() { return <><h1>Scoreboard inspector</h1><Load>{edition => <Inspector editionId={edition._id} />}</Load></>; }

function Inspector({ editionId }: { editionId: string }) {
  const overall = useQuery(ref<{ editionId: string }, Standing[]>("scoreboard:getOverall"), { editionId });
  const categories = useQuery(ref<{ editionId: string }, Category[]>("categories:listCurrent"), { editionId });
  const [categoryId, setCategoryId] = useState("");
  const category = useQuery(ref<{ editionId: string; categoryId: string }, Standing[]>("scoreboard:getCategory"), categoryId ? { editionId, categoryId } : "skip");
  const [selected, setSelected] = useState<string | null>(null);
  const contributions = useQuery(ref<{ schoolId: string }, Contribution[]>("scoreboard:getContributionBreakdown"), selected ? { schoolId: selected } : "skip");
  const standings = categoryId ? category : overall;
  const selectedSchool = standings?.find(school => school.id === selected);
  const totalPoints = standings?.reduce((sum, school) => sum + school.points, 0) ?? 0;

  return <div className="scoreboard-inspector">
    <p>Review official totals and inspect the published events contributing to each school’s score.</p>
    <section className="scoreboard-summary card" aria-label="Scoreboard summary">
      <div><span className="eyebrow">Schools ranked</span><strong>{standings?.length ?? "—"}</strong><p className="small">Active schools in this edition</p></div>
      <div><span className="eyebrow">Points awarded</span><strong>{standings ? totalPoints : "—"}</strong><p className="small">Official total in this view</p></div>
      <div><span className="eyebrow">Current leader</span><strong>{standings?.[0]?.name ?? "No results yet"}</strong><p className="small">{standings?.[0] ? `${standings[0].points} points` : "Publish results to begin"}</p></div>
    </section>
    <section className="scoreboard-filter card">
      <label className="field"><span>Standings scope</span><select value={categoryId} onChange={event => { setCategoryId(event.target.value); setSelected(null); }}><option value="">Overall standings</option>{categories?.map(item => <option key={item._id} value={item._id}>{item.name}</option>)}</select></label>
      <p className="small">{categoryId ? "Showing official points for the selected category." : "Showing each school’s official points across every category."}</p>
    </section>
    {standings === undefined ? <p>Loading official totals…</p> : !standings.length ? <div className="empty-state"><h3>No schools yet</h3><p>Add active schools and publish results to populate the scoreboard.</p></div> : <div className="table-wrap scoreboard-table" tabIndex={0}><table><caption className="small">{categoryId ? categories?.find(item => item._id === categoryId)?.name ?? "Category" : "Overall"} standings</caption><thead><tr><th scope="col">Rank</th><th scope="col">School</th><th scope="col">Total</th><th scope="col">Details</th></tr></thead><tbody>{standings.map(school => <tr key={school.id} className={selected === school.id ? "is-selected" : ""}><td><span className={`rank-mark${school.rank <= 3 ? " is-medal" : ""}`}>{school.rank}</span></td><td>{school.name}</td><td className="points-cell">{school.points}</td><td><button className="button secondary" aria-expanded={selected === school.id} onClick={() => setSelected(selected === school.id ? null : school.id)}>Contributions</button></td></tr>)}</tbody></table></div>}
    {selected && <section className="card scoreboard-contributions"><header><div><span className="eyebrow">Published events</span><h2>Published contributions</h2><p className="small">{selectedSchool?.name ?? "Selected school"}</p></div><button className="button secondary" onClick={() => setSelected(null)}>Close</button></header>{contributions?.length ? <ul>{contributions.map(row => <li key={row.eventId}><span>{row.eventTitle}</span><strong>{row.points} points</strong></li>)}</ul> : <p>No official event points.</p>}<p className="small">Only active published revisions contribute to the public scoreboard.</p></section>}
  </div>;
}
