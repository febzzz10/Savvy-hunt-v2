import Link from "next/link";
import type { ProgrammeEvent } from "../editorial";
import { dateLabel, timeLabel } from "../editorial";
import { Icon } from "../ui";
import "./mobile-updates.css";

type PublishedResult = { eventSlug: string; eventTitle: string; categoryId: string };
export function MobileUpdates({ events, results, categories }: {
  events?: ProgrammeEvent[]; results?: PublishedResult[]; categories?: { _id: string; name: string }[];
}) {
  const live = events?.find(event => event.status === "live");
  const next = events?.find(event => event.status === "upcoming");
  const result = results?.[0];
  const category = (id: string) => categories?.find(item => item._id === id)?.name;
  return <nav className="mobile-event-updates" aria-label="Live event updates">
    <Link className="mobile-update-card mobile-update-live" href={live ? `/events/${live.slug}` : "/schedule"}>
      <span className="mobile-update-label"><span className="mobile-live-dot" aria-hidden="true" /> LIVE NOW</span>
      <span className="mobile-update-arrow" aria-hidden="true"><svg className="icon" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      <div className="mobile-update-content"><span className="mobile-update-tile" aria-hidden="true"><Icon name="calendar" /></span><div className="mobile-update-copy"><strong>{events === undefined ? "Checking live events…" : live?.title || "No event is live right now"}</strong>{live && <span>{[category(live.categoryId), live.venue].filter(Boolean).join(" · ") || "Venue to be announced"}</span>}</div>{live && <span className="mobile-live-badge"><span aria-hidden="true">●</span> Live</span>}</div>
    </Link>
    <Link className="mobile-update-card mobile-update-next" href={next ? `/events/${next.slug}` : "/schedule"}>
      <span className="mobile-update-label"><Icon name="clock" /> NEXT UP</span>
      <span className="mobile-update-arrow" aria-hidden="true"><svg className="icon" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      <div className="mobile-update-content"><span className="mobile-update-tile" aria-hidden="true"><Icon name="calendar" /></span><div className="mobile-update-copy"><strong>{events === undefined ? "Loading the programme…" : next?.title || "Schedule to be announced"}</strong>{next && <span>{[category(next.categoryId), `${dateLabel(next.startsAt)} · ${timeLabel(next.startsAt)} IST`].filter(Boolean).join(" · ")}</span>}</div></div>
    </Link>
    <Link className="mobile-update-card mobile-update-results" href={result ? `/events/${result.eventSlug}` : "/results"}>
      <span className="mobile-update-label"><Icon name="trophy" /> LATEST RESULTS</span>
      <span className="mobile-update-arrow" aria-hidden="true"><svg className="icon" width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m9 5 7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
      <div className="mobile-update-content"><span className="mobile-update-tile" aria-hidden="true"><svg width="25" height="28" viewBox="0 0 25 28" fill="none"><path d="M14 3H5a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h9M14 3l6 6h-6V3ZM9 20h13m-4-4 4 4-4 4M8 9h2M8 13h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></span><div className="mobile-update-copy"><strong>{results === undefined ? "Checking official results…" : result?.eventTitle || "Official results pending"}</strong>{result && <span>{[category(result.categoryId), "Results Published"].filter(Boolean).join(" · ")}</span>}</div></div>
    </Link>
  </nav>;
}
