import type { Standing } from "../editorial";

// The podium always shows at most three cards on one row, visually ordered 2-1-3.
// Slots follow the existing data order (index 0 = centre/largest), not the rank
// number, so tied schools (e.g. 1, 2, 2) still occupy one slot each instead of
// stacking inside a shared rank column. The displayed rank and "Tied" label still
// come from the official rank.
export function SchoolPodium({ rows }: { rows: Standing[] }) {
  const top = rows.slice(0, 3);
  const slots = [top[1], top[0], top[2]].map((row, slot) => row && { row, tier: [2, 1, 3][slot] }).filter(Boolean) as { row: Standing; tier: number }[];
  return <div className="school-podium-scroll" role="region" aria-label="Leading schools podium">
    <div className="school-podium">
      {slots.map(({ row, tier }) => {
        const tied = rows.filter(other => other.rank === row.rank).length > 1;
        return <div className="school-podium-place" data-rank={row.rank} data-tier={tier} key={row.id}>
          <article className="school-podium-card" aria-label={`${row.name}, rank ${row.rank}, ${row.points} points`}>
            <span className="school-medal" aria-hidden="true">{row.rank}</span>
            {tier === 1 && <svg className="school-crown" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" aria-hidden="true"><path d="m3 7 4 4 5-7 5 7 4-4-3 12H6L3 7Zm3 9h12" /><circle cx="12" cy="3" r="1" /></svg>}
            <h3>{row.name}</h3>
            {tied && <span className="tie-label">Tied</span>}
            <p className="school-podium-score"><strong>{row.points}</strong><span>points</span></p>
          </article>
        </div>;
      })}
    </div>
  </div>;
}
