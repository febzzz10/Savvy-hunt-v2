"use client";
import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Load, mut, ref } from "@/components/data";
import { useUnsavedChanges } from "@/components/admin/events/shared";
import { friendlyResultsError } from "@/lib/results-editor";

type Announcement = { _id: string; title: string; body: string; status: "draft" | "published" | "hidden" };
export default function Page() { return <><h1>Announcements</h1><Load>{edition => <Manager editionId={edition._id} />}</Load></>; }

function Manager({ editionId }: { editionId: string }) {
  const items = useQuery(ref<{ editionId: string }, Announcement[]>("announcements:listAdmin"), { editionId });
  const save = useMutation(mut<{ editionId: string; id?: string; title: string; body: string }, string>("announcements:save"));
  const setStatus = useMutation(mut<{ id: string; status: "published" | "hidden" }, unknown>("announcements:setStatus"));
  const [id, setId] = useState<string | undefined>(), [title, setTitle] = useState(""), [body, setBody] = useState("");
  const [notice, setNotice] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState("");
  const editing = id ? items?.find(item => item._id === id) : undefined;
  const dirty = editing ? title !== editing.title || body !== editing.body : Boolean(title.trim() || body.trim());
  useUnsavedChanges(dirty);
  function discard(message = "Discard your unsaved announcement?") { return !dirty || confirm(message); }
  function reset() { setId(undefined); setTitle(""); setBody(""); }
  async function submit() {
    setBusy("save"); setError(""); setNotice("");
    try { await save({ editionId, id, title, body }); reset(); setNotice(id ? "Announcement draft updated" : "Draft saved"); }
    catch (cause) { setError(friendlyResultsError(cause)); }
    finally { setBusy(""); }
  }
  async function changeStatus(item: Announcement, status: "published" | "hidden") {
    if (status === "hidden" && !confirm(`Hide “${item.title}” from the public site?`)) return;
    setBusy(item._id); setError(""); setNotice("");
    try { await setStatus({ id: item._id, status }); setNotice(status === "published" ? "Announcement published" : "Announcement hidden"); }
    catch (cause) { setError(friendlyResultsError(cause)); }
    finally { setBusy(""); }
  }
  const published = items?.filter(item => item.status === "published").length ?? 0;
  return <div className="announcements-page">
    <section className="announcements-intro card"><div><span className="eyebrow">Public updates</span><h2>Share what families need to know</h2><p className="small">Drafts stay private. Published announcements appear on the public site immediately.</p></div><div className="announcements-count"><strong>{published}</strong><span className="small">published</span></div></section>
    <form className="card announcement-form" onSubmit={event => { event.preventDefault(); void submit(); }}>
      <header><h2>{id ? "Edit announcement" : "New announcement"}</h2>{editing && <span className="pill" data-status={editing.status}>{editing.status}</span>}</header>
      <label className="field"><span>Title</span><input required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} aria-describedby="announcement-title-help" /><small id="announcement-title-help">{title.length}/120 characters</small></label>
      <label className="field"><span>Message</span><textarea required maxLength={2000} rows={6} value={body} onChange={event => setBody(event.target.value)} aria-describedby="announcement-body-help" /><small id="announcement-body-help">{body.length}/2000 characters</small></label>
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
      <div className="actions"><button className="button" disabled={Boolean(busy)}>{busy === "save" ? "Saving…" : "Save draft"}</button>{id && <button type="button" className="button secondary" disabled={Boolean(busy)} onClick={() => { if (discard("Discard changes to this announcement?")) { reset(); setError(""); setNotice(""); } }}>Cancel edit</button>}<button type="button" className="button secondary" disabled={Boolean(busy)} onClick={() => { if (discard("Start a new announcement and discard this draft?")) { reset(); setError(""); setNotice(""); } }}>New announcement</button></div>
    </form>
    <section className="announcement-list"><header><div><span className="eyebrow">All announcements</span><h2>Drafts and published updates</h2></div></header>
      {items === undefined ? <p>Loading announcements…</p> : !items.length ? <div className="empty-state"><h3>No announcements yet</h3><p>Write a short update and publish it when it is ready.</p></div> : items.map(item => <article className="card announcement-item" key={item._id}><header><span className="pill" data-status={item.status}>{item.status}</span><h2>{item.title}</h2></header><p>{item.body}</p><div className="actions"><button className="button secondary" disabled={Boolean(busy)} onClick={() => { if (discard("Discard your current announcement draft?")) { setId(item._id); setTitle(item.title); setBody(item.body); setError(""); setNotice(""); } }}>Edit</button><button className="button" disabled={Boolean(busy)} onClick={() => void changeStatus(item, "published")}>{busy === item._id ? "Updating…" : "Publish"}</button><button className="button secondary" disabled={Boolean(busy)} onClick={() => void changeStatus(item, "hidden")}>Hide</button></div></article>)}
    </section>
  </div>;
}
