"use client";
import { useEffect, useState } from "react";
import { ConvexError } from "convex/values";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Load } from "@/components/data";
import { GalleryPhoto } from "@/components/gallery-photo";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import "./gallery.css";

function errorText(error: unknown) { return error instanceof ConvexError && typeof error.data === "string" ? error.data : error instanceof Error ? error.message : "The operation failed. Please try again."; }
export default function Page() { return <><h1>Gallery manager</h1><Load>{edition => <Manager editionId={edition._id} />}</Load></>; }
type View = "pending" | "approved" | "rejected";

function Manager({ editionId }: { editionId: Id<"editions"> }) {
  const [view, setView] = useState<View>("pending"), [notice, setNotice] = useState(""), [error, setError] = useState(""), [syncBusy, setSyncBusy] = useState(false);
  const sync = useAction(api.gallerySync.syncNow);
  const state = useQuery(api.gallerySyncData.getState, { editionId });
  function report(message: string) { setNotice(message); setError(""); }
  function fail(message: string) { setError(message); setNotice(""); }
  async function syncNow() {
    setSyncBusy(true); setError(""); setNotice("");
    try { const result = await sync({ editionId }); setNotice(result.started ? "Drive sync started. Photos will appear here as they are imported." : "A Drive sync is already running."); }
    catch (cause) { setError(errorText(cause)); } finally { setSyncBusy(false); }
  }
  return <>
    <div className="gallery-intro">
      <p>Add photos directly to the shared Google Drive gallery folder. Photos are checked every 2 minutes and remain pending until an administrator reviews and confirms publication consent.</p>
      <section className="gallery-sync card">
        <div><span className="eyebrow">Drive gallery</span><strong>{state?.running ? "Sync in progress" : state?.finishedAt ? "Last sync complete" : "Waiting for first sync"}</strong></div>
        <p className="small">{state?.finishedAt ? `${new Date(state.finishedAt).toLocaleString()} · ${state.imported} imported · ${state.checked} checked` : "Photos are imported automatically from Google Drive."}</p>
        {state?.lastError && <p className="error" role="alert">Drive sync failed: {state.lastError}</p>}
        <button className="button secondary" disabled={syncBusy || state?.running} onClick={() => void syncNow()}>{state?.running ? "Syncing Drive…" : syncBusy ? "Starting sync…" : "Sync Now"}</button>
      </section>
    </div>
    <div className="gallery-toolbar">
      <div className="actions" role="group" aria-label="Gallery views">{(["pending", "approved", "rejected"] as const).map(tab => <button key={tab} className={`button${view === tab ? "" : " secondary"}`} aria-pressed={view === tab} onClick={() => setView(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}</div>
      <p className="small">Review consent before publishing. Hidden photos stay in the library but do not appear publicly.</p>
    </div>
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status" aria-live="polite">{notice}</p>}
    <PhotoList key={view} editionId={editionId} view={view} report={report} fail={fail} />
  </>;
}

function PhotoList({ editionId, view, report, fail }: { editionId: Id<"editions">; view: View; report: (message: string) => void; fail: (message: string) => void }) {
  const { results, status, loadMore } = usePaginatedQuery(api.gallery.pageAdmin, { editionId, view }, { initialNumItems: 12 });
  useEffect(() => { if (status === "CanLoadMore" && results.length === 0) loadMore(12); }, [status, results.length, loadMore]);
  const label = view[0].toUpperCase() + view.slice(1);
  return <section className="gallery-list">
    <header className="gallery-list-head"><div><span className="eyebrow">Review queue</span><h2>{label} photos</h2></div><span className="pill" data-status={view}>{results.length}{status === "CanLoadMore" ? "+" : ""} shown</span></header>
    {results.map(item => <PhotoEditor key={`${item._id}:${item.reviewVersion ?? 0}:${item.observedMd5Checksum ?? item.verifiedMd5Checksum ?? item.consentMd5Checksum ?? "unverified"}`} item={item} report={report} fail={fail} />)}
    {status === "LoadingFirstPage" && <p className="gallery-loading">Loading gallery…</p>}
    {status === "Exhausted" && !results.length && <div className="empty-state"><h3>No {view} photos</h3><p>Photos appear here after a Drive sync and move between views as you review them.</p></div>}
    {status === "CanLoadMore" && <button className="button secondary" onClick={() => loadMore(12)}>Load more photos</button>}
    {status === "LoadingMore" && <p className="gallery-loading">Loading more photos…</p>}
  </section>;
}

function PhotoEditor({ item, report, fail }: { item: Doc<"galleryItems">; report: (message: string) => void; fail: (message: string) => void }) {
  const approve = useAction(api.gallery.approve), hide = useMutation(api.gallery.hide), reject = useMutation(api.gallery.reject), update = useMutation(api.gallery.updateMetadata), move = useMutation(api.gallery.move);
  const [altText, setAlt] = useState(item.altText), [caption, setCaption] = useState(item.caption ?? ""), [consent, setConsent] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false);
  const status = item.approvalStatus === "draft" ? "pending" : item.approvalStatus;
  const verifiable = Boolean(item.observedMd5Checksum || item.verifiedMd5Checksum || item.consentMd5Checksum);
  async function action(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    try { await work(); report(success); } catch (cause) { fail(errorText(cause)); } finally { setBusy(false); }
  }
  async function confirmAction(message: string, work: () => Promise<unknown>, success: string) {
    if (confirm(message)) await action(work, success);
  }
  return <article className="card gallery-item">
    <div className="gallery-preview"><GalleryPhoto id={item._id} alt={item.altText} preview /></div>
    <div className="gallery-item-body">
      <header className="gallery-item-head"><span className="pill" data-status={status}>{status === "hidden" ? "hidden" : status}</span><span className="small">{item.filename ?? item.altText}</span></header>
      <p className="small">Source: {item.source ?? "drive"}{item.sortOrder !== undefined ? ` · Position ${item.sortOrder + 1}` : ""}</p>
      {item.availability === "missing" && <p className="error" role="alert">This photo is missing, trashed or outside the gallery folders. Restore it and sync before approval.</p>}
      {item.consentConfirmedBy && <p className="small">Publication consent recorded by {item.consentConfirmedBy}{item.consentConfirmedAt ? ` on ${new Date(item.consentConfirmedAt).toLocaleString()}` : ""}{!item.consentConfirmed ? " (withdrawn; review required)" : ""}.</p>}
      {item.approvedBy && <p className="small">Last approved by {item.approvedBy}{item.approvedAt ? ` on ${new Date(item.approvedAt).toLocaleString()}` : ""}.</p>}
      {item.rejectionReason && <p className="small">Rejection reason: {item.rejectionReason}</p>}
      <form className="gallery-description" onSubmit={event => { event.preventDefault(); void action(() => update({ itemId: item._id, altText, caption }), "Photo description saved"); }}>
        <label className="field"><span>Photo alt text</span><input required maxLength={500} value={altText} onChange={event => setAlt(event.target.value)} /></label>
        <label className="field"><span>Photo caption</span><input maxLength={2000} value={caption} onChange={event => setCaption(event.target.value)} /></label>
        <button className="button secondary" disabled={busy}>Save description</button>
      </form>
      <label className="checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> I have reviewed this photo and verified permission to publish it publicly, including required student consent.</label>
      <div className="gallery-actions actions">
        <button className="button" disabled={busy || !consent || item.availability === "missing" || !verifiable} onClick={() => void confirmAction("Publish this photo publicly? Confirm that consent has been verified.", () => approve({ itemId: item._id, consentConfirmed: consent, expectedMd5Checksum: item.observedMd5Checksum ?? item.verifiedMd5Checksum ?? item.consentMd5Checksum, expectedReviewVersion: item.reviewVersion ?? 0 }), "Image verified and approved")}>Verify and publish</button>
        <button className="button secondary" disabled={busy} onClick={() => void confirmAction("Hide this photo from the public gallery?", () => hide({ itemId: item._id }), "Image hidden")}>Hide</button>
        <button className="button secondary" disabled={busy} onClick={() => void action(() => move({ itemId: item._id, direction: "earlier" }), "Photo order updated")}>Move earlier</button>
        <button className="button secondary" disabled={busy} onClick={() => void action(() => move({ itemId: item._id, direction: "later" }), "Photo order updated")}>Move later</button>
      </div>
      <details className="gallery-reject">
        <summary>Reject or remove from review</summary>
        <label className="field"><span>Rejection reason</span><input maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></label>
        <button className="button secondary" disabled={busy || !reason.trim()} onClick={() => void confirmAction("Reject this photo? Add a clear reason so another organizer can follow up.", () => reject({ itemId: item._id, reason }), "Photo rejected")}>Reject photo</button>
      </details>
    </div>
  </article>;
}
