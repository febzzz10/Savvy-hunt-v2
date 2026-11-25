"use client";

import { EventDialog } from "../events/shared";

export function DeleteAnnouncementDialog({ title, busy, error, onCancel, onConfirm }: { title: string; busy: boolean; error: string; onCancel: () => void; onConfirm: () => void }) {
  return <EventDialog title="Delete announcement" busy={busy} onClose={onCancel}>
    <div className="event-dialog-body">
      <p>Delete <strong>{title}</strong>?</p>
      <p className="small">This permanently deletes the announcement. Audit history is retained. This action cannot be undone.</p>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
    <footer className="event-dialog-footer actions">
      <button className="button secondary" disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="button danger" disabled={busy} onClick={onConfirm}>{busy ? "Deleting…" : "Delete Announcement"}</button>
    </footer>
  </EventDialog>;
}
