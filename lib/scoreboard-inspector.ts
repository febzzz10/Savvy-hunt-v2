// Pure presentation helpers for the admin scoreboard inspector. Ranks come from the backend
// (`convex/lib/scoring.ts`): equal points share a dense rank, names break display ties.
export type Standing = { id: string; name: string; points: number; rank: number; categoryPoints?: Record<string, number> };
export type Contribution = { eventId: string; eventTitle: string; categoryId: string; points: number };
export type Category = { _id: string; name: string };

/** Filter by school name without re-ranking: official ranks stay attached to each row. */
export function filterStandings(standings: Standing[], search: string) {
  const query = search.trim().toLowerCase();
  return query ? standings.filter(row => row.name.toLowerCase().includes(query)) : standings;
}

/** True when another school shares this row's rank on points; schools without points are not "tied". */
export function isTied(standings: Standing[], row: Standing) {
  return row.points > 0 && standings.some(other => other.id !== row.id && other.rank === row.rank);
}

/** Leaders exist only once official points exist; a shared top rank lists every leader. */
export function summarize(standings: Standing[]) {
  const totalPoints = standings.reduce((sum, row) => sum + row.points, 0);
  const top = standings[0]?.points ?? 0;
  const leaders = top > 0 ? standings.filter(row => row.points === top) : [];
  return { schools: standings.length, totalPoints, leaders, leaderPoints: top };
}

/** Podium styling applies only to ranks 1–3 that actually hold points. */
export function isMedal(row: Standing) {
  return row.points > 0 && row.rank <= 3;
}

/**
 * Group a school's published contributions by category, in category order.
 * With `categoryId`, only that category is returned so the list adds up to the row total.
 */
export function groupContributions(rows: Contribution[], categories: Category[], categoryId?: string) {
  const names = new Map(categories.map(category => [category._id, category.name]));
  const order = new Map(categories.map((category, index) => [category._id, index]));
  const groups = new Map<string, { categoryId: string; name: string; points: number; events: Contribution[] }>();
  for (const row of rows) {
    if (categoryId && row.categoryId !== categoryId) continue;
    const group = groups.get(row.categoryId) ?? { categoryId: row.categoryId, name: names.get(row.categoryId) ?? "Other category", points: 0, events: [] };
    group.points += row.points;
    group.events.push(row);
    groups.set(row.categoryId, group);
  }
  return [...groups.values()]
    .map(group => ({ ...group, events: [...group.events].sort((a, b) => b.points - a.points || a.eventTitle.localeCompare(b.eventTitle)) }))
    .sort((a, b) => (order.get(a.categoryId) ?? Infinity) - (order.get(b.categoryId) ?? Infinity));
}

export const pointsLabel = (points: number) => `${points} ${points === 1 ? "point" : "points"}`;
