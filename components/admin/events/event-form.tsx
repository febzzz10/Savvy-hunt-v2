"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { friendlyResultsError } from "@/lib/results-editor";
import { localDate, statuses, statusLabel, useUnsavedChanges, type EventRecord, type EventStatus } from "./shared";

export function EventForm({ editionId, categories, schools, event, latest, onSaved, onCancel, onDirtyChange, onBusyChange }: {
  editionId: Id<"editions">; categories: Doc<"categories">[]; schools: Doc<"schools">[];
  event?: EventRecord; latest?: EventRecord; onSaved: () => void; onCancel?: () => void;
  onDirtyChange: (dirty: boolean) => void; onBusyChange: (busy: boolean) => void;
}) {
  const save = useMutation(api.events.save);
  const initial = { title: event?.title ?? "", categoryId: event?.categoryId ?? "", date: event ? localDate(event.startsAt) : "", end: event?.endsAt ? localDate(event.endsAt) : "", venue: event?.venue ?? "", description: event?.description ?? "", status: event?.status ?? "upcoming", participants: event?.participatingSchoolIds ?? [] };
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const lock = useRef(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useEffect(() => onBusyChange(busy), [busy, onBusyChange]);
  const stale = Boolean(event && latest && event.updatedAt !== latest.updatedAt);
  useUnsavedChanges(dirty);
  const field = (name: "title" | "categoryId" | "date" | "end" | "venue" | "description", value: string) => setValues(current => ({ ...current, [name]: value }));
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (lock.current || stale) return;
    const startsAt = Date.parse(`${values.date}:00+05:30`), endsAt = values.end ? Date.parse(`${values.end}:00+05:30`) : undefined;
    if (!values.title.trim()) { setError("Enter an event title."); return; }
    if (!Number.isFinite(startsAt) || (endsAt !== undefined && (!Number.isFinite(endsAt) || endsAt <= startsAt))) { setError("End time must be after the start time."); return; }
    if (event && event.status !== values.status && !confirm(`Change this event to ${statusLabel(values.status)}? The public schedule will update immediately.`)) return;
    lock.current = true; setBusy(true); setError("");
    try {
      await save({ editionId, id: event?._id, title: values.title.trim(), categoryId: values.categoryId as Id<"categories">, startsAt, endsAt, venue: values.venue, description: values.description, status: values.status as EventStatus, participatingSchoolIds: !values.participants.length && !event?.participatingSchoolIds?.length ? undefined : values.participants });
      onSaved();
    } catch (cause) { setError(friendlyResultsError(cause)); }
    finally { lock.current = false; setBusy(false); }
  }
  return <form className="event-form" onSubmit={submit} aria-busy={busy}>
    <h2>{event ? "Edit event" : "Create event"}</h2><p className="small">{event ? "Update programme details." : "Add the next event to the programme."}</p>
    <fieldset disabled={busy} className="event-fields">
      <label className="field"><span>Event title *</span><input autoFocus={Boolean(event)} required maxLength={160} value={values.title} onChange={e => field("title", e.target.value)} placeholder="Enter event title" /></label>
      <label className="field"><span>Category *</span><select required value={values.categoryId} onChange={e => field("categoryId", e.target.value)}><option value="">Select category</option>{categories.map(category => <option key={category._id} value={category._id}>{category.name}</option>)}</select></label>
      <label className="field"><span>Starts at * · Asia/Kolkata</span><input required type="datetime-local" value={values.date} onChange={e => field("date", e.target.value)} /></label>
      <label className="field"><span>Ends at · Asia/Kolkata (optional)</span><input type="datetime-local" min={values.date} value={values.end} onChange={e => field("end", e.target.value)} /></label>
      <label className="field"><span>Venue</span><input maxLength={200} value={values.venue} onChange={e => field("venue", e.target.value)} placeholder="Hall, stage or classroom" /></label>
      <label className="field"><span>Status</span><select value={values.status} onChange={e => setValues({ ...values, status: e.target.value as EventRecord["status"] })}>{statuses.map(status => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
      <details className="event-extra" open={event ? true : undefined}><summary>Description & participating schools</summary>
        <label className="field"><span>Description (optional)</span><textarea maxLength={4000} value={values.description} onChange={e => field("description", e.target.value)} /></label>
        <fieldset><legend>Participating schools</legend><p className="small">Leave unchecked to allow all active schools.</p><div className="event-school-options">{schools.filter(s => s.status === "active" || values.participants.includes(s._id)).map(school => <label className="checkbox" key={school._id}><input type="checkbox" checked={values.participants.includes(school._id)} onChange={e => setValues({ ...values, participants: e.target.checked ? [...values.participants, school._id] : values.participants.filter(id => id !== school._id) })} />{school.name}{school.status !== "active" ? " (archived)" : ""}</label>)}</div></fieldset>
      </details>
    </fieldset>
    {stale && <p className="error" role="alert">This event changed in another session. Cancel and reopen the editor to load the latest details.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="actions"><button className="button" disabled={busy || stale || !categories.length}>{busy ? "Saving…" : event ? "Save event" : "Create event"}</button>{onCancel && <button className="button secondary" type="button" disabled={busy} onClick={() => { if (!dirty || confirm("Discard your unsaved changes?")) onCancel(); }}>Cancel</button>}</div>
  </form>;
}
