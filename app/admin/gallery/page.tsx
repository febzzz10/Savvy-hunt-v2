"use client";
import { useEffect, useState } from "react";
import { ConvexError } from "convex/values";
import { useAction, useMutation, usePaginatedQuery, useQuery } from "convex/react";
import { Load } from "@/components/data";
import { GalleryPhoto } from "@/components/gallery-photo";
import { Skeleton } from "@/components/ui";
import { AdminPageHeader, ConfirmDialog, FeedbackToast, Segmented, adminTime, photoStatus, useFeedback } from "@/components/admin/admin-ui";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import "./gallery.css";

function errorText(error: unknown) { return error instanceof ConvexError && typeof error.data === "string" ? error.data : error instanceof Error ? error.message : "The operation failed. Please try again."; }
export default function Page() {
  return <>
    <AdminPageHeader title="Gallery manager" description="Photos come from the shared Google Drive gallery folder and are checked every 2 minutes. Nothing is public until you confirm consent and publish it." />
    <Load>{edition => <Manager editionId={edition._id} />}</Load>
  </>;
}
type View = "pending" | "approved" | "rejected";
const viewHelp: Record<View, string> = {
  pending: "New and changed photos waiting for a consent check before they can be published.",
  approved: "Photos on the public gallery, in public order. Use Move earlier or later to reorder.",
  rejected: "Rejected and hidden photos. They stay in the library and can be reviewed and published again.",
};

function Manager({ editionId }: { editionId: Id<"editions"> }) {
  const [view, setView] = useState<View>("pending"), [syncBusy, setSyncBusy] = useState(false);
  const [count, setCount] = useState<number>();
  const { feedback, success, error, clear } = useFeedback();
  const sync = useAction(api.gallerySync.syncNow);
  const state = useQuery(api.gallerySyncData.getState, { editionId });
  async function syncNow() {
    setSyncBusy(true); clear();
    try { const result = await sync({ editionId }); success(result.started ? "Drive sync started. New photos appear in Pending as they are imported." : "A Drive sync is already running."); }
    catch (cause) { error(errorText(cause)); } finally { setSyncBusy(false); }
  }
  const syncState = state === undefined ? "loading" : state?.running ? "running" : state?.lastError ? "error" : state?.finishedAt ? "done" : "idle";
  return <>
    <section className="gallery-sync" data-state={syncState} aria-label="Google Drive sync">
      <span className="gallery-sync-dot" aria-hidden="true" />
      <div className="gallery-sync-text">
        <strong>{syncState === "running" ? "Syncing with Google Drive…" : syncState === "error" ? "Last Drive sync failed" : syncState === "done" ? "Drive sync complete" : syncState === "loading" ? "Checking sync status…" : "Waiting for the first Drive sync"}</strong>
        <span>{state?.finishedAt ? `${adminTime(state.finishedAt)} · ${state.imported} imported · ${state.checked} checked` : "Photos are imported automatically every 2 minutes."}</span>
        {state?.lastError && <span className="error" role="alert">Drive sync failed: {state.lastError}</span>}
      </div>
      <button className="button secondary compact" disabled={syncBusy || state?.running} onClick={() => void syncNow()}>{state?.running ? "Syncing Drive…" : syncBusy ? "Starting sync…" : "Sync Now"}</button>
    </section>
    <div className="gallery-toolbar">
      <Segmented label="Gallery views" value={view} onChange={setView} options={(["pending", "approved", "rejected"] as const).map(value => ({ value, label: value[0].toUpperCase() + value.slice(1), ...(value === view && count !== undefined ? { count } : {}) }))} />
      <p className="small">{viewHelp[view]}</p>
    </div>
    <PhotoList key={view} editionId={editionId} view={view} report={success} fail={error} onCount={setCount} />
    <FeedbackToast feedback={feedback} onDismiss={clear} />
  </>;
}

function PhotoList({ editionId, view, report, fail, onCount }: { editionId: Id<"editions">; view: View; report: (message: string) => void; fail: (message: string) => void; onCount: (count: number | undefined) => void }) {
  const { results, status, loadMore } = usePaginatedQuery(api.gallery.pageAdmin, { editionId, view }, { initialNumItems: 12 });
  useEffect(() => { if (status === "CanLoadMore" && results.length === 0) loadMore(12); }, [status, results.length, loadMore]);
  // Only an exhausted list has an exact count; other states show no tab count rather than a guess.
  const exact = status === "Exhausted" ? results.length : undefined;
  useEffect(() => { onCount(exact); return () => onCount(undefined); }, [exact, onCount]);
  return <section className="gallery-list" aria-labelledby="gallery-list-title">
    <h2 id="gallery-list-title" className="gallery-list-title">{view[0].toUpperCase() + view.slice(1)} photos</h2>
    {results.map(item => <PhotoEditor key={`${item._id}:${item.reviewVersion ?? 0}:${item.observedMd5Checksum ?? item.verifiedMd5Checksum ?? item.consentMd5Checksum ?? "unverified"}`} item={item} report={report} fail={fail} />)}
    {status === "LoadingFirstPage" && <Skeleton label="Loading gallery…" />}
    {status === "Exhausted" && !results.length && <div className="gallery-empty"><h3>No {view} photos</h3><p>{view === "pending" ? "Everything has been reviewed. New photos added to the Drive folder appear here after the next sync." : "Photos move here as you review them in Pending."}</p></div>}
    {status === "CanLoadMore" && <button className="button secondary gallery-more" onClick={() => loadMore(12)}>Load more photos</button>}
    {status === "LoadingMore" && <p className="gallery-loading" role="status">Loading more photos…</p>}
  </section>;
}

type Confirming = "approve" | "hide" | "reject";
function PhotoEditor({ item, report, fail }: { item: Doc<"galleryItems">; report: (message: string) => void; fail: (message: string) => void }) {
  const approve = useAction(api.gallery.approve), hide = useMutation(api.gallery.hide), reject = useMutation(api.gallery.reject), update = useMutation(api.gallery.updateMetadata), move = useMutation(api.gallery.move);
  const [altText, setAlt] = useState(item.altText), [caption, setCaption] = useState(item.caption ?? ""), [consent, setConsent] = useState(false), [reason, setReason] = useState(""), [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState<Confirming>(), [dialogError, setDialogError] = useState("");
  const { status, label } = photoStatus(item.approvalStatus);
  const verifiable = Boolean(item.observedMd5Checksum || item.verifiedMd5Checksum || item.consentMd5Checksum);
  const missing = item.availability === "missing";
  const descriptionDirty = altText !== item.altText || caption !== (item.caption ?? "");
  const publishHint = missing ? "Restore the file in Drive and sync before publishing." : !verifiable ? "Waiting for Drive to report this file's checksum. Run Sync Now, then try again." : !consent ? "Tick the consent confirmation to enable publishing." : "";
  async function action(work: () => Promise<unknown>, success: string) {
    setBusy(true);
    try { await work(); report(success); } catch (cause) { fail(errorText(cause)); } finally { setBusy(false); }
  }
  async function confirmed() {
    if (!confirming || busy) return;
    setBusy(true); setDialogError("");
    try {
      if (confirming === "approve") { await approve({ itemId: item._id, consentConfirmed: consent, expectedMd5Checksum: item.observedMd5Checksum ?? item.verifiedMd5Checksum ?? item.consentMd5Checksum, expectedReviewVersion: item.reviewVersion ?? 0 }); report("Photo verified and published."); }
      else if (confirming === "hide") { await hide({ itemId: item._id }); report("Photo hidden from the public gallery."); }
      else { await reject({ itemId: item._id, reason }); report("Photo rejected."); }
      setConfirming(undefined);
    } catch (cause) { setDialogError(errorText(cause)); }
    finally { setBusy(false); }
  }
  const name = item.filename ?? item.altText;
  return <article className="gallery-item" data-status={status}>
    <div className="gallery-preview"><GalleryPhoto id={item._id} alt={item.altText} preview layout="masonry" /></div>
    <div className="gallery-item-body">
      <header className="gallery-item-head">
        <div className="gallery-item-title"><span className="pill" data-status={status}>{label}</span><h3>{name}</h3></div>
        <p className="gallery-item-meta">Source: {item.source === "drive" || !item.source ? "Google Drive" : item.source}{item.sortOrder !== undefined ? ` · Position ${item.sortOrder + 1}` : ""}</p>
      </header>
      {missing && <p className="gallery-alert" role="alert">This photo is missing, trashed or outside the gallery folders. Restore it in Drive and sync before approval.</p>}
      {(item.consentConfirmedBy || item.approvedBy || item.rejectionReason) && <dl className="gallery-history">
        {item.consentConfirmedBy && <div><dt>Consent</dt><dd>Recorded by {item.consentConfirmedBy}{item.consentConfirmedAt ? `, ${adminTime(item.consentConfirmedAt)}` : ""}{!item.consentConfirmed ? " · withdrawn, review required" : ""}</dd></div>}
        {item.approvedBy && <div><dt>Approved</dt><dd>Last by {item.approvedBy}{item.approvedAt ? `, ${adminTime(item.approvedAt)}` : ""}</dd></div>}
        {item.rejectionReason && <div><dt>Rejected</dt><dd>{item.rejectionReason}</dd></div>}
      </dl>}
      <form className="gallery-description" onSubmit={event => { event.preventDefault(); void action(() => update({ itemId: item._id, altText, caption }), "Photo description saved."); }}>
        <label className="field"><span>Photo alt text</span><input required maxLength={500} value={altText} onChange={event => setAlt(event.target.value)} aria-describedby={`alt-help-${item._id}`} /><small id={`alt-help-${item._id}`}>Describes the photo for screen reader users.</small></label>
        <label className="field"><span>Photo caption</span><input maxLength={2000} value={caption} onChange={event => setCaption(event.target.value)} /><small>Optional. Shown under the photo.</small></label>
        <button className="button secondary compact" disabled={busy || !descriptionDirty}>Save description</button>
      </form>
      <div className="gallery-publish">
        <label className="checkbox"><input type="checkbox" checked={consent} onChange={event => setConsent(event.target.checked)} /> I have reviewed this photo and verified permission to publish it publicly, including required student consent.</label>
        <div className="gallery-publish-row">
          <button className="button compact" disabled={busy || !consent || missing || !verifiable} onClick={() => { setDialogError(""); setConfirming("approve"); }}>Verify and publish</button>
          {publishHint && <span className="small">{publishHint}</span>}
        </div>
      </div>
      <div className="gallery-manage">
        <div className="gallery-order" role="group" aria-label={`Order of ${name}`}>
          <button className="button secondary compact" disabled={busy} onClick={() => void action(() => move({ itemId: item._id, direction: "earlier" }), "Photo order updated.")}>Move earlier</button>
          <button className="button secondary compact" disabled={busy} onClick={() => void action(() => move({ itemId: item._id, direction: "later" }), "Photo order updated.")}>Move later</button>
        </div>
        <button className="button secondary danger compact" disabled={busy} onClick={() => { setDialogError(""); setConfirming("hide"); }}>Hide</button>
      </div>
      <details className="gallery-reject">
        <summary>Reject or remove from review</summary>
        <label className="field"><span>Rejection reason</span><input maxLength={2000} value={reason} onChange={event => setReason(event.target.value)} placeholder="e.g. No consent form for this group" /></label>
        <button className="button secondary danger compact" disabled={busy || !reason.trim()} onClick={() => { setDialogError(""); setConfirming("reject"); }}>Reject photo</button>
      </details>
    </div>
    {confirming && <ConfirmDialog
      title={confirming === "approve" ? "Publish photo" : confirming === "hide" ? "Hide photo" : "Reject photo"}
      confirmLabel={confirming === "approve" ? "Publish photo" : confirming === "hide" ? "Hide photo" : "Reject photo"}
      busyLabel={confirming === "approve" ? "Publishing…" : "Saving…"}
      tone={confirming === "approve" ? "primary" : "danger"} busy={busy} error={dialogError}
      onCancel={() => { if (!busy) setConfirming(undefined); }} onConfirm={() => void confirmed()}>
      <p>{confirming === "approve" ? "Publish" : confirming === "hide" ? "Hide" : "Reject"} <strong>{name}</strong>?</p>
      <p className="small">{confirming === "approve" ? "It appears in the public gallery straight away. Only continue if publication consent has been verified." : confirming === "hide" ? "It is removed from the public gallery and moves to the Rejected view. It stays in the library and can be published again later." : <>The reason is recorded for other organizers: “{reason.trim()}”.</>}</p>
    </ConfirmDialog>}
  </article>;
}
