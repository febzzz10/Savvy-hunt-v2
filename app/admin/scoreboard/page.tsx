"use client";
import { useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { Load, ref } from "@/components/data";
import { Icon, Skeleton } from "@/components/ui";
import { AdminPageHeader, Segmented } from "@/components/admin/admin-ui";
import { filterStandings, groupContributions, isMedal, isTied, pointsLabel, summarize, type Category, type Contribution, type Standing } from "@/lib/scoreboard-inspector";
import "./scoreboard.css";

export default function Page() {
  return <div className="scoreboard-inspector">
    <AdminPageHeader title="Scoreboard inspector" description="Check official totals and see which published events make up each school’s score." actions={<Link className="button secondary" href="/scoreboard">View public scoreboard <Icon name="arrow" /></Link>} />
    <Load fallback={<Skeleton label="Loading official totals…" />}>{edition => <Inspector editionId={edition._id} />}</Load>
  </div>;
}

function Inspector({ editionId }: { editionId: string }) {
  const overall = useQuery(ref<{ editionId: string }, Standing[]>("scoreboard:getOverall"), { editionId });
  const categories = useQuery(ref<{ editionId: string }, Category[]>("categories:listCurrent"), { editionId });
  const [categoryId, setCategoryId] = useState("");
  const category = useQuery(ref<{ editionId: string; categoryId: string }, Standing[]>("scoreboard:getCategory"), categoryId ? { editionId, categoryId } : "skip");
  const [selected, setSelected] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const standings = categoryId ? category : overall;
  const scopeName = categoryId ? categories?.find(item => item._id === categoryId)?.name ?? "Category" : "Overall";
  const visible = standings ? filterStandings(standings, search) : [];
  const summary = standings ? summarize(standings) : undefined;

  return <>
    <dl className="scoreboard-summary" aria-label={`${scopeName} summary`}>
      <div><dt>Schools ranked</dt><dd>{summary?.schools ?? "—"}</dd></div>
      <div><dt>Points awarded</dt><dd>{summary?.totalPoints ?? "—"}</dd></div>
      <div className="scoreboard-leader"><dt>{summary && summary.leaders.length > 1 ? "Joint leaders" : "Leader"}</dt>
        <dd>{!summary ? "—" : summary.leaders.length ? summary.leaders.map(row => row.name).join(", ") : "No points yet"}</dd>
        <dd className="small">{!summary ? "Loading" : summary.leaders.length ? `${summary.leaders.length > 1 ? "Tied on " : ""}${pointsLabel(summary.leaderPoints)}` : "Appears once results are published"}</dd>
      </div>
    </dl>

    <section className="scoreboard-panel" aria-labelledby="scoreboard-standings-title">
      <header className="scoreboard-panel-head">
        <h2 id="scoreboard-standings-title">{scopeName} standings</h2>
        <p className="small">{categoryId ? "Official points earned in this category." : "Official points across every category, including Common."}</p>
      </header>
      <div className="scoreboard-controls">
        <Segmented label="Standings scope" value={categoryId} onChange={setCategoryId} options={[{ value: "", label: "Overall" }, ...(categories ?? []).map(item => ({ value: item._id, label: item.name }))]} />
        <label className="field scoreboard-search"><span>Search schools</span><input type="search" placeholder="School name" value={search} onChange={event => setSearch(event.target.value)} /></label>
      </div>
      <div className="scoreboard-status">
        <span role="status">{standings ? `Showing ${visible.length} of ${standings.length} schools` : "Loading official totals…"}</span>
        {search && <button type="button" className="text-link" onClick={() => setSearch("")}>Clear search</button>}
      </div>

      {standings === undefined ? <Skeleton label="Loading official totals…" />
        : !standings.length ? <div className="scoreboard-empty"><h3>No schools yet</h3><p>Add schools and publish results to fill the scoreboard.</p><Link className="text-link" href="/admin/schools">Manage schools <Icon name="arrow" /></Link></div>
        : !visible.length ? <div className="scoreboard-empty"><h3>No matching schools</h3><p>No school name contains “{search.trim()}”. Try another name or clear the search.</p></div>
        : <>
          <div className="scoreboard-columns" aria-hidden="true"><span>Rank</span><span>School</span><span>Points</span><span /></div>
          <ol className="scoreboard-list" aria-label={`${scopeName} standings`}>
            {visible.map(school => {
              const open = selected === school.id, tied = isTied(standings, school), detailId = `breakdown-${school.id}`;
              return <li key={school.id} data-open={open || undefined}>
                <button type="button" className="scoreboard-row" aria-expanded={open} aria-controls={detailId} onClick={() => setSelected(open ? null : school.id)}>
                  <span className={`rank-mark${isMedal(school) ? " is-medal" : ""}`} data-rank={school.rank}><span className="sr-only">Rank </span>{school.rank}</span>
                  <span className="scoreboard-name">{school.name}{tied && <span className="scoreboard-tie">Tied</span>}</span>
                  <span className="scoreboard-points"><strong>{school.points}</strong> <span>{school.points === 1 ? "pt" : "pts"}</span></span>
                  <svg className="scoreboard-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
                  <span className="sr-only">{open ? "Hide" : "Show"} score breakdown</span>
                </button>
                {open && <div className="scoreboard-detail" id={detailId}><Breakdown school={school} categoryId={categoryId} categories={categories ?? []} /></div>}
              </li>;
            })}
          </ol>
        </>}
    </section>
  </>;
}

function Breakdown({ school, categoryId, categories }: { school: Standing; categoryId: string; categories: Category[] }) {
  const contributions = useQuery(ref<{ schoolId: string }, Contribution[]>("scoreboard:getContributionBreakdown"), { schoolId: school.id });
  const groups = contributions ? groupContributions(contributions, categories, categoryId || undefined) : [];
  const eventTotal = groups.reduce((sum, group) => sum + group.points, 0);
  const scope = categoryId ? ` in ${categories.find(item => item._id === categoryId)?.name ?? "this category"}` : "";

  return <>
    {!categoryId && school.categoryPoints && categories.length > 0 && <div className="scoreboard-categories">
      <h3>Points by category</h3>
      <ul>{categories.map(item => { const points = school.categoryPoints?.[item._id] ?? 0; return <li key={item._id} data-empty={!points || undefined}><span>{item.name}</span><strong>{points}</strong></li>; })}</ul>
    </div>}
    <div className="scoreboard-events">
      <h3>Published events{scope}</h3>
      {contributions === undefined ? <p className="small" role="status">Loading published events…</p>
        : !groups.length ? <p className="scoreboard-none">No published event points for {school.name}{scope} yet.</p>
        : <>
          {groups.map(group => <div className="scoreboard-group" key={group.categoryId}>
            {!categoryId && <h4><span>{group.name}</span><span>{pointsLabel(group.points)}</span></h4>}
            <ul>{group.events.map(row => <li key={row.eventId}><Link href={`/admin/events/${row.eventId}/results`}>{row.eventTitle}</Link><strong>{pointsLabel(row.points)}</strong></li>)}</ul>
          </div>)}
          <p className="scoreboard-total"><span>Total from published events</span><strong>{pointsLabel(eventTotal)}</strong></p>
        </>}
      <p className="small scoreboard-note">Only each event’s current published result counts. Drafts, revoked results and zero-point entries are not listed. Select an event to open its results.</p>
    </div>
  </>;
}
