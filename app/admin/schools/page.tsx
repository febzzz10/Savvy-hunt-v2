"use client";

import "../events/events.css";
import "./schools.css";
import { useRef, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Load } from "@/components/data";
import { Icon } from "@/components/ui";
import { EventDialog, useUnsavedChanges } from "@/components/admin/events/shared";
import { filterSchools, schoolError, validateSchool, type School, type SchoolValues } from "@/lib/school-manager";

const blank: SchoolValues = { name: "" };
export default function Page() {
  return <div className="school-manager"><header className="school-heading"><span className="eyebrow">ORGANIZER WORKSPACE</span><h1>Schools</h1><p className="muted">Manage participating schools and their official points.</p></header><Load>{edition => <Manager editionId={edition._id} />}</Load></div>;
}
function Manager({ editionId }: { editionId: Id<"editions"> }) {
  const schools = useQuery(api.schools.listAdmin, { editionId });
  const standings = useQuery(api.scoreboard.getOverall, { editionId });
  const save = useMutation(api.schools.save);
  const remove = useMutation(api.schools.remove);
  const [editing, setEditing] = useState<School>();
  const [values, setValues] = useState<SchoolValues>(blank);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [error, setError] = useState(""), [notice, setNotice] = useState(""), [busy, setBusy] = useState(false);
  const [search, setSearch] = useState(""), [sort, setSort] = useState("az");
  const [deleting, setDeleting] = useState<School>();
  const [deleteError, setDeleteError] = useState("");
  const lock = useRef(false), nameInput = useRef<HTMLInputElement>(null), panel = useRef<HTMLDivElement>(null);
  const initial = editing ? { name: editing.name } : blank;
  const dirty = JSON.stringify(initial) !== JSON.stringify(values);
  useUnsavedChanges(dirty);
  const stale = Boolean(editing && schools && schools.find(s => s._id === editing._id)?.updatedAt !== editing.updatedAt);
  function reset() { setEditing(undefined); setValues(blank); setErrors({}); setError(""); }
  function edit(school?: School) {
    if (lock.current || (dirty && !confirm("Discard your unsaved school changes?"))) return;
    setEditing(school); setValues(school ? { name: school.name } : blank); setErrors({}); setError("");
    requestAnimationFrame(() => { panel.current?.scrollIntoView({ behavior: "instant", block: "start" }); nameInput.current?.focus(); });
  }
  async function persist(next: SchoolValues, school?: School) {
    if (lock.current) return;
    if (school && schools?.find(s => s._id === school._id)?.updatedAt !== school.updatedAt) { setError("This school changed in another session. Close the confirmation and reopen the editor to load its latest details."); return; }
    lock.current = true; setBusy(true); setError(""); setNotice("");
    try {
      await save({ editionId, id: school?._id, name: next.name.trim() });
      setNotice(school ? "School changes saved." : "School added.");
      if (editing?._id === school?._id) reset();
    } catch (cause) { setError(schoolError(cause)); }
    finally { lock.current = false; setBusy(false); }
  }
  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (lock.current || !schools || stale) return;
    const validation = validateSchool(values, schools, editing?._id); setErrors(validation); setError("");
    if (Object.keys(validation).length) { nameInput.current?.focus(); return; }
    void persist(values, editing);
  }
  async function deleteSchool() {
    if (!deleting || lock.current) return;
    lock.current = true; setBusy(true); setDeleteError("");
    try {
      await remove({ editionId, schoolId: deleting._id, expectedUpdatedAt: deleting.updatedAt });
      setNotice(`${deleting.name} deleted.`);
      setDeleting(undefined);
      if (editing?._id === deleting._id) reset();
    } catch (cause) { setDeleteError(schoolError(cause, "delete")); }
    finally { lock.current = false; setBusy(false); }
  }
  const filtered = schools ? filterSchools(schools, search, sort) : [];
  return <>
    {notice && <p className="event-notice" role="status">{notice}</p>}
    <div className="event-manager-grid school-manager-grid">
      <div className="event-create-panel school-form-panel" data-mode={editing ? "edit" : "add"} ref={panel}>
        <form className="event-form" noValidate onSubmit={submit} aria-labelledby="school-form-title">
          <span className="eyebrow">{editing ? "Editing school" : "New participant"}</span><h2 id="school-form-title">{editing ? "Edit school" : "Add school"}</h2>
          <p className="small">{editing ? `Update ${editing.name}. Existing results and official points stay linked to this school.` : "Add a school to this edition."}</p>
          <fieldset className="event-fields" disabled={busy || !schools}>
            <label className="field"><span>School name *</span><input id="school-name" ref={nameInput} required maxLength={120} value={values.name} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "school-name-error" : undefined} onChange={e => { setValues({ ...values, name: e.target.value }); setErrors({ ...errors, name: undefined }); }} />{errors.name && <span className="error" id="school-name-error">{errors.name}</span>}</label>
          </fieldset>
          <p className="small">A school with published results or scoreboard history cannot be deleted; its official records are retained.</p>
          {stale && <p className="error" role="alert">This school changed in another session. Cancel and reopen Edit to refresh its details.</p>}
          {error && <p className="error" role="alert">{error}</p>}
          <div className="actions"><button className="button" disabled={busy || !schools || stale}>{busy ? "Saving…" : editing ? "Save changes" : "Add school"}</button>{editing && <button type="button" className="button secondary" disabled={busy} onClick={() => edit()}>Cancel</button>}</div>
        </form>
      </div>
      <section className="event-feed school-feed" aria-labelledby="school-list-title">
        <header className="event-feed-heading"><h2 id="school-list-title">Participating schools</h2><span className="pill" aria-label={schools ? `${schools.length} total schools` : "Loading school count"}>{schools?.length ?? "—"}</span></header>
        <div className="event-feed-filters school-filters">
          <label className="field school-search"><span>Search schools</span><input type="search" placeholder="School name" value={search} onChange={e => setSearch(e.target.value)} /></label>
          <label className="field"><span>Sort by</span><select value={sort} onChange={e => setSort(e.target.value)}><option value="az">Name: A–Z</option><option value="za">Name: Z–A</option><option value="updated">Recently updated</option></select></label>
        </div>
        <div className="event-feed-summary"><span role="status">{schools ? `Showing ${filtered.length} of ${schools.length} schools` : "Loading participating schools…"}</span>{(search || sort !== "az") && <button className="text-link" onClick={() => { setSearch(""); setSort("az"); }}>Clear filters</button>}</div>
        {schools && !filtered.length && <div className="school-empty"><h3>{schools.length ? "No matching schools" : "No schools added yet"}</h3><p>{schools.length ? "Try another name or clear the filters." : "Use the form to add your first participating school."}</p></div>}
        {filtered.map(school => <SchoolItem key={school._id} school={school} points={standings?.find(s => s.id === school._id)?.points} busy={busy} editing={editing?._id === school._id} onEdit={() => edit(school)} onDelete={() => { setDeleteError(""); setDeleting(school); }} />)}
      </section>
    </div>
    {deleting && <EventDialog title="Delete School?" busy={busy} onClose={() => { if (!busy) { setDeleting(undefined); setDeleteError(""); } }}><div className="event-dialog-body"><p><strong>{deleting.name}</strong></p><p>Are you sure you want to delete this school? This action cannot be undone.</p>{deleteError && <p role="alert" className="error">{deleteError}</p>}</div><footer className="event-dialog-footer"><div className="actions"><button className="button secondary" disabled={busy} onClick={() => { setDeleting(undefined); setDeleteError(""); }}>Cancel</button><button className="button" disabled={busy} onClick={() => void deleteSchool()}>{busy ? "Deleting…" : "Delete School"}</button></div></footer></EventDialog>}
  </>;
}
function SchoolItem({ school, points, busy, editing, onEdit, onDelete }: { school: School; points?: number; busy: boolean; editing: boolean; onEdit: () => void; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const breakdown = useQuery(api.scoreboard.getContributionBreakdown, expanded ? { schoolId: school._id } : "skip");
  return <article className="event-feed-item school-item" data-editing={editing} aria-label={school.name}>
    <div className="school-item-top"><div><h3>{school.name}</h3>{editing && <p className="small"><span className="school-edit-label">Editing</span></p>}</div><div className="school-points"><strong>{points ?? "—"}</strong><span>{points === undefined ? "Loading points…" : "Official points"}</span></div></div>
    <div className="event-item-actions"><button className="button secondary" disabled={busy} onClick={onEdit}>Edit</button><button className="button secondary" disabled={busy} onClick={onDelete} aria-label={`Delete ${school.name}`}><Icon name="trash" />Delete</button><button className="text-link" aria-expanded={expanded} aria-controls={`details-${school._id}`} onClick={() => setExpanded(!expanded)}>{expanded ? "Hide details" : "View details"}</button></div>
    {expanded && <div id={`details-${school._id}`} className="school-details"><h4>Published event contributions</h4>{breakdown === undefined ? <p role="status">Loading contributions…</p> : breakdown.length ? <ul>{breakdown.map(row => <li key={row.eventId}><Link href={`/admin/events/${row.eventId}/results`}>{row.eventTitle}</Link><strong>{row.points} pts</strong></li>)}</ul> : <p>No published contributions.</p>}</div>}
  </article>;
}
