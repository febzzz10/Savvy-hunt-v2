import type { Standing } from "../editorial";

export function SchoolPodium({ rows }: { rows: Standing[] }) {
  return <>
    <p className="school-podium-hint" id="school-podium-help">Scroll sideways to explore the podium.</p>
    <div className="school-podium-scroll" role="region" aria-label="Leading schools podium" aria-describedby="school-podium-help" tabIndex={0}>
      <div className="school-podium">
        {[2, 1, 3].map(rank => <div className="school-podium-place" data-rank={rank} key={rank}>
          {rows.filter(row => row.rank === rank).map(row => <article className="school-podium-card" key={row.id} aria-label={`${row.name}, rank ${rank}, ${row.points} points`}>
            <span className="school-medal" aria-hidden="true">{rank}</span>
            {rank === 1 && <svg className="school-crown" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="m3 7 4 4 5-7 5 7 4-4-3 12H6L3 7Zm3 9h12" /><circle cx="12" cy="3" r="1" /></svg>}
            <h3>{row.name}</h3>
            {rows.filter(other => other.rank === rank).length > 1 && <span className="tie-label">Tied</span>}
            <p className="school-podium-score"><strong>{row.points}</strong><span>points</span></p>
          </article>)}
        </div>)}
      </div>
    </div>
  </>;
}
