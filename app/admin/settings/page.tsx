"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Load, mut, ref } from "@/components/data";
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
  const [eventTitle, setTitle] = useState(initial.eventTitle), [tagline, setTagline] = useState(initial.tagline ?? ""), [contactInfo, setContact] = useState(initial.contactInfo ?? ""), [notice, setNotice] = useState("");
  return <form className="card" onSubmit={async event => { event.preventDefault(); try { await update({ editionId, eventTitle, tagline, contactInfo }); setNotice("Public content saved"); } catch (error) { setNotice(String(error)); } }}><label className="field"><span>Event title</span><input required value={eventTitle} onChange={event => setTitle(event.target.value)} /></label><label className="field"><span>About text</span><textarea value={tagline} onChange={event => setTagline(event.target.value)} /></label><label className="field"><span>Contact information</span><textarea value={contactInfo} onChange={event => setContact(event.target.value)} /></label><button className="button">Save public content</button><p role="status">{notice}</p></form>;
}
