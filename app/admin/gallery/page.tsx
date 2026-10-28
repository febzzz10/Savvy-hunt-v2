"use client";
import { useEffect, useState } from "react";
import { ConvexError } from "convex/values";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Load } from "@/components/data";
import { GalleryPhoto } from "@/components/gallery-photo";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
function errorText(error: unknown) { return error instanceof ConvexError && typeof error.data === "string" ? error.data : error instanceof Error ? error.message : "The operation failed. Please try again."; }
export default function Page() { return <><h1>Gallery manager</h1><Load>{edition => <Manager editionId={edition._id} />}</Load></>; }
type View = "pending" | "approved" | "rejected";
function Manager({ editionId }: { editionId: Id<"editions"> }) {
  const [view, setView] = useState<View>("pending"), [notice, setNotice] = useState(""), [syncBusy, setSyncBusy] = useState(false);
  const sync = useAction(api.gallerySync.syncNow);
  const state = useQuery(api.gallerySyncData.getState, { editionId });
  async function syncNow() {
    setSyncBusy(true);
    try { const result = await sync({ editionId }); setNotice(result.started ? "Drive sync started. Photos will appear here as they are imported." : "A Drive sync is already running."); }
    catch (error) { setNotice(errorText(error)); } finally { setSyncBusy(false); }
  }
  return <>
    <p>Add photos directly to the shared Google Drive gallery folder. Photos are checked every 2 minutes and remain pending until an administrator reviews and confirms publication consent.</p>
    <div className="actions" role="group" aria-label="Gallery views">{(["pending", "approved", "rejected"] as const).map(tab => <button key={tab} className={`button${view === tab ? "" : " secondary"}`} aria-pressed={view === tab} onClick={() => setView(tab)}>{tab[0].toUpperCase() + tab.slice(1)}</button>)}<button className="button secondary" disabled={syncBusy || state?.running} onClick={() => void syncNow()}>{state?.running ? "Syncing Drive…" : "Sync Now"}</button></div>
    {state?.finishedAt && <p>Last sync: {new Date(state.finishedAt).toLocaleString()} · {state.imported} imported · {state.checked} checked</p>}
    {state?.lastError && <p role="alert">Drive sync failed: {state.lastError}</p>}
    <p role="status" aria-live="polite">{notice}</p>
    <PhotoList key={view} editionId={editionId} view={view} report={setNotice} />
  </>;
}
function PhotoList({ editionId, view, report }: { editionId: Id<"editions">; view: View; report: (message: string) => void }) {
  const { results, status, loadMore } = usePaginatedQuery(api.gallery.pageAdmin, { editionId, view }, { initialNumItems: 12 });
  // Legacy draft/hidden aliases share this list; continue past empty filtered pages.
  useEffect(() => { if (status === "CanLoadMore" && results.length === 0) loadMore(12); }, [status, results.length, loadMore]);
  return <><h2>{view[0].toUpperCase() + view.slice(1)} photos</h2>{results.map(item => <PhotoEditor key={`${item._id}:${item.reviewVersion ?? 0}:${item.observedMd5Checksum ?? item.verifiedMd5Checksum ?? item.consentMd5Checksum ?? "unverified"}`} item={item} report={report} />)}{status === "LoadingFirstPage" && <p>Loading gallery…</p>}{status === "Exhausted" && !results.length && <p>No {view} photos.</p>}{status === "CanLoadMore" && <button className="button secondary" onClick={() => loadMore(12)}>Load more photos</button>}{status === "LoadingMore" && <p>Loading more photos…</p>}</>;
}
function PhotoEditor({ item, report }: { item: Doc<"galleryItems">; report: (message: string) => void }) {
  const approve = useAction(api.gallery.approve), hide = useMutation(api.gallery.hide), reject = useMutation(api.gallery.reject), update = useMutation(api.gallery.updateMetadata), move = useMutation(api.gallery.move);
  const [altText, setAlt] = useState(item.altText), [caption, setCaption] = useState(item.caption ?? ""), [consent, setConsent] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false);
  async function action(work: () => Promise<unknown>, success: string) { setBusy(true); try { await work(); report(success); } catch (error) { report(errorText(error)); } finally { setBusy(false); } }
  return <article className="card">
    <span className="pill">{item.approvalStatus === "draft" ? "pending" : item.approvalStatus === "hidden" ? "hidden / rejected" : item.approvalStatus}</span>
    <p>{item.filename ?? item.altText} · Source: {item.source ?? "drive"}</p><GalleryPhoto id={item._id} alt={item.altText} preview />
    {item.availability === "missing" && <p role="alert">This photo is missing, trashed or outside the gallery folders. Restore it and sync before approval.</p>}
    {item.consentConfirmedBy && <p>Publication consent recorded by {item.consentConfirmedBy}{item.consentConfirmedAt ? ` on ${new Date(item.consentConfirmedAt).toLocaleString()}` : ""}{!item.consentConfirmed ? " (withdrawn; review required)" : ""}.</p>}
    {item.approvedBy && <p>Last approved by {item.approvedBy}{item.approvedAt ? ` on ${new Date(item.approvedAt).toLocaleString()}` : ""}.</p>}
    {item.rejectionReason && <p>Rejection reason: {item.rejectionReason}</p>}
    <form onSubmit={event => { event.preventDefault(); void action(() => update({ itemId: item._id, altText, caption }), "Photo description saved"); }}><label className="field"><span>Photo alt text</span><input required maxLength={500} value={altText} onChange={event => setAlt(event.target.value)} /></label><label className="field"><span>Photo caption</span><input maxLength={2000} value={caption} onChange={event => setCaption(event.target.value)} /></label><button className="button secondary" disabled={busy}>Save description</button></form>
    <label className="checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> I have reviewed this photo and verified permission to publish it publicly, including required student consent.</label>
    <div className="actions"><button className="button" disabled={busy || !consent || (item.availability === "missing" || !item.observedMd5Checksum && !item.verifiedMd5Checksum && !item.consentMd5Checksum)} onClick={() => void action(() => approve({ itemId: item._id, consentConfirmed: consent, expectedMd5Checksum: item.observedMd5Checksum ?? item.verifiedMd5Checksum ?? item.consentMd5Checksum, expectedReviewVersion: item.reviewVersion ?? 0 }), "Image verified and approved")}>Verify and publish</button><button className="button secondary" disabled={busy} onClick={() => void action(() => hide({ itemId: item._id }), "Image hidden")}>Hide</button><button className="button secondary" disabled={busy} onClick={() => void action(() => move({ itemId: item._id, direction: "earlier" }), "Photo order updated")}>Move earlier</button><button className="button secondary" disabled={busy} onClick={() => void action(() => move({ itemId: item._id, direction: "later" }), "Photo order updated")}>Move later</button></div>
    <label className="field"><span>Rejection reason</span><input maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} /></label><button className="button secondary" disabled={busy || !reason.trim()} onClick={() => void action(() => reject({ itemId: item._id, reason }), "Photo rejected")}>Reject photo</button>
  </article>;
}
