import Link from "next/link";
import { timeLabel, type ProgrammeEvent } from "../editorial";
import { Icon, Skeleton } from "../ui";
import "./event-updates.css";

export function EventUpdates({ events, categories }: {
  events?: ProgrammeEvent[];
  categories?: { _id: string; name: string }[];
}) {
  const priority = (event: ProgrammeEvent) => event.status === "live" ? 0 : event.status === "upcoming" ? 1 : 2;
  const updates = events?.filter(event => event.status === "live" || event.status === "upcoming" || event.hasPublishedResults)
    .sort((a, b) => priority(a) - priority(b) || a.startsAt - b.startsAt).slice(0, 3);

  return <section className="home-updates" aria-labelledby="home-updates-title">
    <div className="event-schedule-panel">
      <header className="event-schedule-heading">
        <div><span className="eyebrow">Upcoming Events</span><h2 id="home-updates-title">What&apos;s Next?</h2></div>
        <Link className="event-schedule-circle" href="/schedule" aria-label="View event schedule"><Icon name="arrow" /></Link>
      </header>
      {updates === undefined ? <Skeleton label="Loading event updates..." /> : updates.length ? <ul className="event-schedule-list">
        {updates.map(event => {
          const category = categories?.find(item => item._id === event.categoryId)?.name;
          return <li key={event._id}><Link className="event-schedule-row" href={`/events/${event.slug}`}>
            <div className="event-schedule-info">
              <div className="event-schedule-title"><Icon name="trophy" /><h3>{event.title}</h3></div>
              <p className="event-schedule-meta">{category && <><span>{category}</span><span aria-hidden="true"> · </span></>}<span>{timeLabel(event.startsAt)} IST</span></p>
              <p className="event-schedule-venue"><Icon name="pin" /><span>{event.venue || "Venue to be announced"}</span></p>
              <div className="event-schedule-status">
                {event.status === "live" && <span className="pill" data-status="live">Live Now</span>}
                {event.status === "upcoming" && <span className="sr-only">Upcoming</span>}
                {event.hasPublishedResults && <span className="pill" data-status="published">Results Published</span>}
              </div>
            </div>
            <span className="event-row-arrow" aria-hidden="true"><Icon name="arrow" /></span>
          </Link></li>;
        })}
      </ul> : <div className="event-schedule-empty"><Icon name="calendar" /><h3>No event updates yet</h3><p>Live events, upcoming events and published results will appear here when available.</p></div>}
      <Link className="event-schedule-button" href="/schedule"><Icon name="calendar" /><span>View Full Schedule</span><Icon name="arrow" /></Link>
    </div>
  </section>;
}
