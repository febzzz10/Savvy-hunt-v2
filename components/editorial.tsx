import Link from "next/link";
import { Icon } from "./ui";
export type ProgrammeEvent = { _id: string; title: string; slug: string; startsAt: number; categoryId: string; venue?: string; status: string; hasPublishedResults: boolean };
export type Standing = { id: string; name: string; points: number; rank: number; categoryPoints?: Record<string, number> };
export function dateLabel(value: number) { return new Date(value).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", year: "numeric" }); }
export function timeLabel(value: number) { return new Date(value).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit" }); }
export function SectionHeading({ number, title, href, action }: { number: string; title: string; href?: string; action?: string }) {
  return <div className="section-heading"><div><span className="eyebrow">{number}</span><h2>{title}</h2></div>{href && <Link className="text-link" href={href}>{action ?? "View all"} ↗</Link>}</div>;
}
export function Programme({ events, categories }: { events: ProgrammeEvent[]; categories?: { _id: string; name: string }[] }) {
  return <div className="programme">{events.map(event => <Link className="programme-row" href={`/events/${event.slug}`} key={event._id}>
    <time dateTime={new Date(event.startsAt).toISOString()}><strong>{dateLabel(event.startsAt)}</strong><span>{timeLabel(event.startsAt)} IST</span></time>
    <div><span className="eyebrow">{categories?.find(item => item._id === event.categoryId)?.name ?? "Event"}</span><h3>{event.title}</h3>{event.status === "completed" && <span className="muted small">{event.hasPublishedResults ? "Official results published" : "Results pending"}</span>}</div>
    <span className="programme-venue">{event.venue || "Venue to be announced"}</span><span className="pill" data-status={event.status}>{event.status}</span><span className="row-arrow" aria-hidden="true">↗</span>
  </Link>)}</div>;
}
export function Rankings({ rows, preview = false, categories }: { rows: Standing[]; preview?: boolean; categories?: { _id: string; name: string }[] }) {
  const displayed = preview ? rows.filter(row => row.rank <= 3) : rows;
  const columns = categories?.length ? categories : undefined;
  const labels = columns?.map((category, index) => /common/i.test(category.name) ? "COMMON CAT" : `CAT ${index + 1}`);
  return <div className={`table-wrap ${preview ? "rank-preview" : "rankings"}${columns ? " rankings-overall" : ""}`}><table><caption className="sr-only">Official school standings with category points. Equal points share a rank.</caption><thead><tr><th scope="col">Rank</th><th scope="col">School</th>{columns?.map((category, index) => <th scope="col" className="category-col" key={category._id} title={category.name}>{labels![index]}</th>)}<th scope="col" className={columns ? "total-col" : undefined}>{columns ? "Total" : "Points"}</th></tr></thead><tbody>{displayed.map(row => <tr key={row.id}><td><span className="rank-number">{String(row.rank).padStart(2, "0")}</span>{rows.filter(other => other.rank === row.rank).length > 1 && <span className="tie-label">Tied</span>}</td><th scope="row">{row.name}</th>{columns?.map(category => <td className="category-points" key={category._id}>{row.categoryPoints?.[category._id] ?? 0}</td>)}<td className={`points${columns ? " total-points" : ""}`}>{row.points}</td></tr>)}</tbody></table></div>;
}
export function Podium({ rows }: { rows: Standing[] }) {
  const leaders = rows.filter(row => row.points > 0 && row.rank <= 3);
  if (!leaders.length) return null;
  return <div className="podium" aria-label="Leading schools">{leaders.map(row => <article className="leader" data-rank={row.rank} key={row.id}><div className="leader-rank"><Icon name="trophy" /><span>{row.rank}</span></div><span className="small">{rows.filter(other => other.rank === row.rank).length > 1 ? "Tied at rank" : "Rank"} {row.rank}</span><h3>{row.name}</h3><p><strong>{row.points}</strong> official points</p></article>)}</div>;
}
export function Footer() { return <footer className="footer"><div><Link href="/" className="footer-brand">Savvy Hunt<span>.</span></Link><p>School spirit. Official results. Shared moments.</p><small>© {new Date().getFullYear()} Savvy Hunt</small></div><nav aria-label="Footer navigation"><Link href="/schedule">Schedule</Link><Link href="/scoreboard">Scoreboard</Link><Link href="/snapshots">Snapshots</Link></nav></footer>; }
