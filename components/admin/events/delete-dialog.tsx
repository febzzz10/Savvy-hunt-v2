"use client";

import { EventDialog, type EventRecord } from "./shared";

export function DeleteEventDialog({ event, busy, error, onCancel, onConfirm }: { event: EventRecord; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void }) {
  const blocked = event.hasPublicationHistory;
  return <EventDialog title="Delete event" busy={busy} onClose={onCancel}>
    <div className="event-dialog-body">
      <p>Delete <strong>{event.title}</strong>?</p>
      <p className="small">This permanently deletes the event and its draft results. Audit history is retained. This action cannot be undone.</p>
      {blocked && <p className="error" role="alert">This event has published, corrected, or withdrawn results, so it cannot be deleted. The scoreboard and result history stay intact.</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </div>
    <footer className="event-dialog-footer actions">
      <button className="button secondary" disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="button" disabled={busy || blocked} onClick={onConfirm}>{busy ? "Deleting…" : "Delete Event"}</button>
    </footer>
  </EventDialog>;
}
