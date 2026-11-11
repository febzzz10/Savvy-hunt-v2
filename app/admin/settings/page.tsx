"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Load, mut, ref } from "@/components/data";
import { useUnsavedChanges } from "@/components/admin/events/shared";
import { friendlyResultsError } from "@/lib/results-editor";

type Settings = { eventTitle: string; tagline?: string; contactInfo?: string } | null;
export default function Page() { return <><h1>Public content</h1><Load>{edition => <Manager editionId={edition._id} />}</Load></>; }

function Manager({ editionId }: { editionId: string }) {
  const current = useQuery(ref<{ editionId: string }, Settings>("siteSettings:getPublic"), { editionId });
  if (current === undefined) return <p>Loading public content…</p>;
  if (!current) return <p>Edition settings are missing.</p>;
  return <SettingsForm key={`${current.eventTitle}:${current.tagline}:${current.contactInfo}`} editionId={editionId} initial={current} />;
}

function SettingsForm({ editionId, initial }: { editionId: string; initial: NonNullable<Settings> }) {
  const update = useMutation(mut<{ editionId: string; eventTitle: string; tagline?: string; contactInfo?: string }, unknown>("siteSettings:update"));
  const [eventTitle, setTitle] = useState(initial.eventTitle), [tagline, setTagline] = useState(initial.tagline ?? ""), [contactInfo, setContact] = useState(initial.contactInfo ?? "");
  const [notice, setNotice] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  useUnsavedChanges(eventTitle !== initial.eventTitle || tagline !== (initial.tagline ?? "") || contactInfo !== (initial.contactInfo ?? ""));
  async function save() {
    setBusy(true); setError(""); setNotice("");
    try { await update({ editionId, eventTitle, tagline, contactInfo }); setNotice("Public content saved. The public site updates immediately."); }
    catch (cause) { setError(friendlyResultsError(cause)); }
    finally { setBusy(false); }
  }
  return <div className="settings-page">
    <p className="settings-intro">Edit the words shown on the public event page. Changes publish immediately and are visible to every visitor.</p>
    <form className="card settings-form" onSubmit={event => { event.preventDefault(); void save(); }}>
      <header><span className="eyebrow">Event identity</span><h2>Public page copy</h2><p className="small">Keep this concise and useful for families, schools, and visitors.</p></header>
      <label className="field"><span>Event title</span><input required maxLength={120} value={eventTitle} onChange={event => setTitle(event.target.value)} aria-describedby="title-help" /><small id="title-help">{eventTitle.length}/120 characters</small></label>
      <label className="field"><span>About text</span><textarea maxLength={3000} rows={7} value={tagline} onChange={event => setTagline(event.target.value)} aria-describedby="tagline-help" /><small id="tagline-help">{tagline.length}/3000 characters · Shown on the event page introduction.</small></label>
      <label className="field"><span>Contact information</span><textarea maxLength={1000} rows={4} value={contactInfo} onChange={event => setContact(event.target.value)} aria-describedby="contact-help" /><small id="contact-help">{contactInfo.length}/1000 characters · Phone, email, or office hours.</small></label>
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
      <button className="button" disabled={busy}>{busy ? "Saving…" : "Save public content"}</button>
    </form>
    <aside className="card settings-help"><span className="eyebrow">Before you publish</span><h2>Keep public copy accurate</h2><ul><li>Use the school’s official event name.</li><li>Do not include private student information.</li><li>Check contact details before every edition.</li></ul></aside>
  </div>;
}
