"use client";
import { useState } from "react";
import { useQuery } from "convex/react";
import { Load, ref } from "@/components/data";
type Standing = { id: string; name: string; points: number; rank: number };
type Contribution = { eventId: string; eventTitle: string; points: number };
export default function Page() { return <><h1>Scoreboard inspector</h1><Load>{edition => <Inspector editionId={edition._id} />}</Load></>; }
function Inspector({ editionId }: { editionId: string }) {
  const standings = useQuery(ref<{ editionId: string }, Standing[]>("scoreboard:getOverall"), { editionId });
  const [selected, setSelected] = useState<string | null>(null);
  const contributions = useQuery(ref<{ schoolId: string }, Contribution[]>("scoreboard:getContributionBreakdown"), selected ? { schoolId: selected } : "skip");
  return <>{standings === undefined ? <p>Loading official totals…</p> : !standings.length ? <p>No schools yet.</p> : <div className="table-wrap"><table><thead><tr><th scope="col">Rank</th><th scope="col">School</th><th scope="col">Total</th><th scope="col">Details</th></tr></thead><tbody>{standings.map(school => <tr key={school.id}><td>{school.rank}</td><td>{school.name}</td><td>{school.points}</td><td><button className="button secondary" onClick={() => setSelected(selected === school.id ? null : school.id)}>Contributions</button></td></tr>)}</tbody></table></div>}{selected && <section className="card"><h2>Published contributions</h2>{contributions?.length ? contributions.map(row => <p key={row.eventId}>{row.eventTitle}: {row.points} points</p>) : <p>No official event points.</p>}</section>}</>;
}
