"use client";

export default function EventsError({ reset }: { reset: () => void }) {
  return <div className="empty-state" role="alert"><h1>Events could not be loaded</h1><p>Check your connection and admin access, then try again.</p><button className="button" onClick={reset}>Try again</button></div>;
}
