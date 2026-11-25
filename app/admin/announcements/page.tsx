"use client";
import "../events/events.css";
import { useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Load, mut, ref } from "@/components/data";
import { Icon, Skeleton } from "@/components/ui";
import { useUnsavedChanges } from "@/components/admin/events/shared";
import { DeleteAnnouncementDialog } from "@/components/admin/announcements/delete-dialog";
import { AdminPageHeader, ConfirmDialog, FeedbackToast, Segmented, adminTime, useFeedback } from "@/components/admin/admin-ui";
import { friendlyResultsError } from "@/lib/results-editor";

type Status = "draft" | "published" | "hidden";
type Announcement = { _id: string; title: string; body: string; status: Status; createdAt: number; updatedAt: number; publishedAt?: number };
type Filter = "all" | Status;
type Publishing = { kind: "compose" } | { kind: "existing"; item: Announcement };
const statusText: Record<Status, string> = { draft: "Draft", published: "Published", hidden: "Hidden" };

export default function Page() {
  return <div className="announcements-page">
    <AdminPageHeader title="Announcements" description="Write updates for families and schools. Drafts stay private; publishing puts them on the public notice board straight away." />
    <Load>{edition => <Manager editionId={edition._id} />}</Load>
  </div>;
}

function meta(item: Announcement) {
  if (item.status === "published") return `Published ${adminTime(item.publishedAt ?? item.updatedAt)}`;
  return `${item.status === "hidden" ? "Hidden" : "Last saved"} ${adminTime(item.updatedAt)}`;
}

function Manager({ editionId }: { editionId: string }) {
  const items = useQuery(ref<{ editionId: string }, Announcement[]>("announcements:listAdmin"), { editionId });
  const save = useMutation(mut<{ editionId: string; id?: string; title: string; body: string }, string>("announcements:save"));
  const publish = useMutation(mut<{ id: string }, unknown>("announcements:publish"));
  const remove = useMutation(mut<{ id: string }, unknown>("announcements:remove"));
  const [id, setId] = useState<string | undefined>(), [title, setTitle] = useState(""), [body, setBody] = useState("");
  const [error, setError] = useState(""), [busy, setBusy] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [publishing, setPublishing] = useState<Publishing>(), [publishError, setPublishError] = useState(""), [publishTitle, setPublishTitle] = useState("");
  const [deleting, setDeleting] = useState<Announcement>(), [deleteBusy, setDeleteBusy] = useState(false), [deleteError, setDeleteError] = useState("");
  const { feedback, success, error: fail, clear } = useFeedback();
  const deleteLock = useRef(false), form = useRef<HTMLFormElement>(null), titleInput = useRef<HTMLInputElement>(null);
  const editing = id ? items?.find(item => item._id === id) : undefined;
  const dirty = editing ? title !== editing.title || body !== editing.body : Boolean(title.trim() || body.trim());
  const locked = Boolean(busy) || deleteBusy;
  useUnsavedChanges(dirty);
  function discard(message = "Discard your unsaved announcement?") { return !dirty || confirm(message); }
  function reset() { setId(undefined); setTitle(""); setBody(""); setError(""); }
  function startEdit(item: Announcement) {
    if (!discard("Discard your current announcement draft?")) return;
    setId(item._id); setTitle(item.title); setBody(item.body); setError(""); clear();
    requestAnimationFrame(() => { form.current?.scrollIntoView({ behavior: "instant", block: "start" }); titleInput.current?.focus(); });
  }
  async function submit() {
    setBusy("save"); setError(""); clear();
    try { await save({ editionId, id, title, body }); reset(); success(id ? "Changes saved as a draft. Publish it when it is ready." : "Draft saved. It is private until you publish it."); }
    catch (cause) { setError(friendlyResultsError(cause)); }
    finally { setBusy(""); }
  }
  function requestComposePublish() {
    if (!form.current?.reportValidity()) return;
    setPublishError(""); setPublishTitle(title.trim()); setPublishing({ kind: "compose" });
  }
  async function confirmPublish() {
    if (!publishing || busy) return;
    setBusy("publish"); setPublishError(""); clear();
    if (publishing.kind === "existing") {
      try { await publish({ id: publishing.item._id }); setPublishing(undefined); success(`“${publishing.item.title}” is published.`); }
      catch (cause) { setPublishError(friendlyResultsError(cause)); }
      finally { setBusy(""); }
      return;
    }
    let savedId: string;
    try { savedId = await save({ editionId, id, title, body }); }
    catch (cause) { setPublishError(friendlyResultsError(cause)); setBusy(""); return; }
    const savedTitle = title.trim();
    reset();
    try { await publish({ id: savedId }); setPublishing(undefined); success(`“${savedTitle}” is published.`); }
    catch (cause) { setPublishing(undefined); fail(`Saved as a draft, but publishing failed: ${friendlyResultsError(cause)} Publish it from the list when ready.`); }
    finally { setBusy(""); }
  }
  async function deleteAnnouncement() {
    if (!deleting || deleteLock.current) return;
    deleteLock.current = true; setDeleteBusy(true); setDeleteError("");
    try {
      await remove({ id: deleting._id });
      if (editing?._id === deleting._id) reset();
      success(`“${deleting.title}” was deleted.`); setDeleting(undefined);
    } catch (cause) { setDeleteError(friendlyResultsError(cause)); }
    finally { deleteLock.current = false; setDeleteBusy(false); }
  }

  const counts = { all: items?.length ?? 0, draft: 0, published: 0, hidden: 0 };
  items?.forEach(item => { counts[item.status] += 1; });
  const visible = items?.filter(item => filter === "all" || item.status === filter) ?? [];
  const options: Array<{ value: Filter; label: string; count: number }> = [{ value: "all", label: "All", count: counts.all }, { value: "draft", label: "Drafts", count: counts.draft }, { value: "published", label: "Published", count: counts.published }];
  if (counts.hidden || filter === "hidden") options.push({ value: "hidden", label: "Hidden", count: counts.hidden });
  const target = publishing?.kind === "existing" ? publishing.item : undefined;

  return <>
    <div className="announcements-layout">
      <form ref={form} className="card announcement-form" data-mode={id ? "edit" : "create"} onSubmit={event => { event.preventDefault(); void submit(); }} aria-labelledby="announcement-form-title">
        <header><h2 id="announcement-form-title">{id ? "Edit announcement" : "New announcement"}</h2>{editing && <span className="pill" data-status={editing.status}>{statusText[editing.status]}</span>}</header>
        {editing?.status === "published" && <p className="announcement-warning" role="note">This announcement is live. Saving changes moves it back to draft and removes it from the public site until you publish it again.</p>}
        <label className="field"><span>Title</span><input ref={titleInput} required maxLength={120} value={title} onChange={event => setTitle(event.target.value)} aria-describedby="announcement-title-help" placeholder="e.g. Quiz finals move to the main hall" /><small id="announcement-title-help">{title.length}/120 characters</small></label>
        <label className="field"><span>Message</span><textarea required maxLength={2000} rows={6} value={body} onChange={event => setBody(event.target.value)} aria-describedby="announcement-body-help" placeholder="What do families and schools need to know?" /><small id="announcement-body-help">{body.length}/2000 characters · Line breaks are kept</small></label>
        {error && <p className="error" role="alert">{error}</p>}
        <div className="actions">
          <button type="button" className="button" disabled={locked} onClick={requestComposePublish}>Save and publish</button>
          <button className="button secondary" disabled={locked}>{busy === "save" ? "Saving…" : "Save draft"}</button>
          {(id || dirty) && <button type="button" className="text-link announcement-reset" disabled={locked} onClick={() => { if (discard(id ? "Discard changes to this announcement?" : "Clear this draft?")) { reset(); clear(); } }}>{id ? "Cancel edit" : "Clear"}</button>}
        </div>
        <div className="announcement-preview" aria-label="Notice board preview">
          <span className="announcement-preview-label">Notice board preview</span>
          {title.trim() || body.trim() ? <article><h3>{title.trim() || "Untitled announcement"}</h3><p>{body.trim() || "Your message appears here."}</p></article> : <p className="small">Start typing to see how this appears on the public notice board.</p>}
        </div>
      </form>

      <section className="announcement-list" aria-labelledby="announcement-list-title">
        <header><h2 id="announcement-list-title">All announcements</h2><span className="admin-count" aria-label={`${counts.all} announcements`}>{counts.all}</span></header>
        {items !== undefined && items.length > 0 && <Segmented label="Filter announcements" value={filter} onChange={setFilter} options={options} />}
        {items === undefined ? <Skeleton label="Loading announcements…" />
          : !items.length ? <div className="announcement-empty"><h3>No announcements yet</h3><p>Write a short update with the form. Save it as a draft or publish it straight away.</p></div>
          : !visible.length ? <div className="announcement-empty"><h3>{filter === "draft" ? "No drafts" : `No ${filter} announcements`}</h3><p>Choose another filter to see the rest.</p></div>
          : visible.map(item => <AnnouncementItem key={item._id} item={item} editing={item._id === id} locked={locked} busy={busy === "publish" && target?._id === item._id}
              onEdit={() => startEdit(item)}
              onPublish={() => { setPublishError(""); setPublishing({ kind: "existing", item }); }}
              onDelete={() => { setDeleteError(""); clear(); setDeleting(item); }} />)}
      </section>
    </div>
    {publishing && <ConfirmDialog title={target?.status === "published" ? "Republish announcement" : "Publish announcement"} confirmLabel={target?.status === "published" ? "Republish" : "Publish"} busyLabel="Publishing…" busy={busy === "publish"} error={publishError} onCancel={() => { if (busy !== "publish") setPublishing(undefined); }} onConfirm={() => void confirmPublish()}>
      <p>{target?.status === "published" ? "Republish" : "Publish"} <strong>{target?.title ?? publishTitle}</strong>?</p>
      <p className="small">{target?.status === "published" ? "It moves to the top of the public notice board, and visitors who have the site open are notified again." : "It appears on the public notice board immediately, and visitors who have the site open see a notification."}</p>
    </ConfirmDialog>}
    {deleting && <DeleteAnnouncementDialog title={deleting.title} busy={deleteBusy} error={deleteError} onCancel={() => { if (!deleteBusy) { setDeleting(undefined); setDeleteError(""); } }} onConfirm={() => void deleteAnnouncement()} />}
    <FeedbackToast feedback={feedback} onDismiss={clear} />
  </>;
}

function AnnouncementItem({ item, editing, locked, busy, onEdit, onPublish, onDelete }: { item: Announcement; editing: boolean; locked: boolean; busy: boolean; onEdit: () => void; onPublish: () => void; onDelete: () => void }) {
  const long = item.body.length > 280 || item.body.split("\n").length > 4;
  const [expanded, setExpanded] = useState(false);
  return <article className="announcement-item" data-status={item.status} data-editing={editing || undefined}>
    <header><span className="pill" data-status={item.status}>{statusText[item.status]}</span><span className="announcement-meta">{meta(item)}</span>{editing && <span className="announcement-editing">Editing</span>}</header>
    <h3>{item.title}</h3>
    <p className="announcement-body" data-clamped={long && !expanded ? "" : undefined}>{item.body}</p>
    {long && <button type="button" className="text-link announcement-more" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Show less" : "Show full message"}</button>}
    <div className="announcement-actions">
      {item.status !== "published" && <button className="button compact" disabled={locked} onClick={onPublish}>{busy ? "Publishing…" : "Publish"}</button>}
      <button className="button secondary compact" disabled={locked} onClick={onEdit}>Edit</button>
      {item.status === "published" && <button className="button secondary compact" disabled={locked} onClick={onPublish}>Republish</button>}
      <button className="button secondary danger compact announcement-delete" disabled={locked} onClick={onDelete} aria-label={`Delete ${item.title}`}><Icon name="trash" /> Delete</button>
    </div>
  </article>;
}
