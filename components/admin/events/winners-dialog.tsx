"use client";

import { useRef, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import type { Doc, Id } from "@/convex/_generated/dataModel";
import { friendlyResultsError, publishGate, sameResultRows } from "@/lib/results-editor";
import { Skeleton } from "@/components/ui";
import { EventDialog, EventPublicationStatus, useUnsavedChanges } from "./shared";

type Data = FunctionReturnType<typeof api.results.getAdminByEvent>;
type Row = { key: string; schoolId: Id<"schools"> | ""; points: string; placement: string; entryLabel: string };
const revisionKey = (data: Data) => `${data.draft?._id ?? "none"}:${data.draft?.draftVersion ?? 0}:${data.event.activePublishedRevisionId ?? "none"}:${data.event.updatedAt}`;
const toRows = (data: Data): Row[] => (data.draft ? data.draftEntries : data.officialEntries).map((row, i) => ({ key: String(i), schoolId: row.schoolId, points: String(row.points), placement: row.placement ? String(row.placement) : "", entryLabel: row.entryLabel ?? "" }));
const entries = (rows: Row[]) => rows.map(row => ({ schoolId: row.schoolId as Id<"schools">, points: Number(row.points), placement: row.placement ? Number(row.placement) : undefined, entryLabel: row.entryLabel.trim() || undefined }));

export function WinnersDialog({ eventId, schools, canPublish, onClose }: { eventId: Id<"events">; schools: Doc<"schools">[]; canPublish: boolean; onClose: () => void }) {
  const data = useQuery(api.results.getAdminByEvent, { eventId });
  if (!data) return <EventDialog title="Publish winners" onClose={onClose}><Skeleton label="Loading event results…" /></EventDialog>;
  return <WinnersEditor eventId={eventId} live={data} schools={schools} canPublish={canPublish} onClose={onClose} />;
}

function WinnersEditor({ eventId, live, schools, canPublish, onClose }: { eventId: Id<"events">; live: Data; schools: Doc<"schools">[]; canPublish: boolean; onClose: () => void }) {
  const client = useConvex();
  const categories = useQuery(api.categories.listCurrent, { editionId: live.event.editionId });
  const save = useMutation(api.results.saveDraft), publish = useMutation(api.results.publish), revoke = useMutation(api.results.revoke);
  // Keep the editing snapshot stable: subscriptions must never erase unsaved work.
  const [base, setBase] = useState(live), [rows, setRows] = useState(() => toRows(live));
  const [reason, setReason] = useState(live.draft?.changeReason ?? "");
  const [busy, setBusy] = useState(""), [notice, setNotice] = useState(""), [error, setError] = useState("");
  const [confirmation, setConfirmation] = useState<"publish" | "revoke" | null>(null);
  const lock = useRef(false), nextKey = useRef(rows.length);
  const stale = revisionKey(base) !== revisionKey(live);
  const isCorrection = Boolean(base.event.activePublishedRevisionId);
  const hasPublicationHistory = base.revisions.some(revision => ["published", "superseded", "revoked"].includes(revision.status));
  const initial = toRows(base);
  const dirty = !sameResultRows(entries(rows), entries(initial)) || reason !== (base.draft?.changeReason ?? "");
  useUnsavedChanges(dirty);
  const preview = useQuery(api.results.preview, live.draft ? { eventId, draftRevisionId: live.draft._id } : "skip");
  const gate = publishGate({ isCorrection, draftExists: Boolean(base.draft), hasPreview: Boolean(preview) && !stale, rows: entries(rows), savedRows: base.draftEntries, officialRows: base.officialEntries, reason, savedReason: base.draft?.changeReason ?? "" });
  const eligible = schools.filter(s => (s.status === "active" || base.officialEntries.some(row => row.schoolId === s._id)) && (!base.event.participatingSchoolIds?.length || base.event.participatingSchoolIds.includes(s._id)));
  function load(data: Data) { setBase(data); setRows(toRows(data)); nextKey.current = toRows(data).length; setReason(data.draft?.changeReason ?? ""); setConfirmation(null); }
  function add(placement: string) { setRows([...rows, { key: `new-${nextKey.current++}`, schoolId: "", points: "", placement, entryLabel: "" }]); setConfirmation(null); }
  function update(key: string, patch: Partial<Row>) { setRows(rows.map(row => row.key === key ? { ...row, ...patch } : row)); setConfirmation(null); }
  function validate() {
    if (rows.length > 200) return "An event can have at most 200 result entries.";
    const seen = new Set<string>();
    for (const row of rows) {
      if (!row.schoolId || !eligible.some(s => s._id === row.schoolId)) return "Choose an eligible school for every entry.";
      if (row.points.trim() === "" || !Number.isSafeInteger(Number(row.points)) || Number(row.points) < 0) return "Enter nonnegative whole-number manual points for every entry.";
      if (row.placement && (!Number.isSafeInteger(Number(row.placement)) || Number(row.placement) < 1)) return "Placements must be positive whole numbers.";
      // Existing multi-entry school results remain editable. New ambiguous duplicates are blocked.
      const duplicate = seen.has(row.schoolId);
      const existingCount = initial.filter(item => item.schoolId === row.schoolId).length;
      if (duplicate && existingCount < rows.filter(item => item.schoolId === row.schoolId).length) return "A school is selected more than once. Use a different school for each winner.";
      seen.add(row.schoolId);
    }
    if (isCorrection && !reason.trim()) return "Enter a reason for this correction.";
    return "";
  }
  async function perform(action: "save" | "publish" | "revoke") {
    if (lock.current || stale) return;
    const invalid = action === "revoke" ? (!reason.trim() ? "Enter a reason before revoking results." : "") : validate();
    if (invalid) { setError(invalid); setConfirmation(null); return; }
    if (action === "publish" && (!gate.ready || !base.draft || !preview)) return;
    lock.current = true; setBusy(action); setError(""); setNotice("");
    try {
      if (action === "save") {
        await save({ eventId, entries: entries(rows), reason: isCorrection ? reason.trim() : undefined, expectedDraftVersion: base.draft?.draftVersion });
        setNotice("Draft saved. Public results are unchanged. Review the score impact before publishing.");
      } else if (action === "publish" && base.draft && preview) {
        const result = await publish({ eventId, draftRevisionId: base.draft._id, expectedActiveRevisionId: base.event.activePublishedRevisionId ?? null, expectedDraftVersion: base.draft.draftVersion ?? 0 });
        setNotice(result.status === "unchanged" ? "The official results are already current." : "Official results published. School totals have updated.");
      } else if (action === "revoke") {
        await revoke({ eventId, reason: reason.trim(), expectedActiveRevisionId: base.event.activePublishedRevisionId ?? null });
        setNotice("Official results revoked. The revision history is kept.");
      }
      load(await client.query(api.results.getAdminByEvent, { eventId }));
    } catch (cause) { setError(friendlyResultsError(cause)); }
    finally { lock.current = false; setBusy(""); setConfirmation(null); }
  }
  function renderRow(row: Row, other = false) {
    return <div className="winner-entry" key={row.key}>
      <label className="field winner-school"><span>School *</span><select required value={row.schoolId} onChange={e => update(row.key, { schoolId: e.target.value as Id<"schools"> })}><option value="">Select school</option>{eligible.map(school => <option key={school._id} value={school._id} disabled={school._id !== row.schoolId && rows.some(item => item.schoolId === school._id)}>{school.name}{school.status !== "active" ? " (archived)" : ""}</option>)}</select></label>
      <label className="field"><span>Manual points *</span><input type="number" required min="0" step="1" value={row.points} onChange={e => update(row.key, { points: e.target.value })} /></label>
      <label className="field winner-school"><span>Entry / team label (optional)</span><input value={row.entryLabel} onChange={e => update(row.key, { entryLabel: e.target.value })} /></label>
      {other && <label className="field"><span>Placement (optional)</span><input type="number" min="1" step="1" value={row.placement} onChange={e => update(row.key, { placement: e.target.value })} /></label>}
      <button type="button" className="text-link winner-remove" onClick={() => { setRows(rows.filter(item => item.key !== row.key)); setConfirmation(null); }} aria-label={`Remove ${schools.find(s => s._id === row.schoolId)?.name ?? "empty entry"} from ${row.placement ? `place ${row.placement}` : "other results"}`}>Remove</button>
    </div>;
  }
  return <EventDialog title="Publish winners" onClose={onClose} busy={Boolean(busy)} dirty={dirty}>
    <div className="event-dialog-body">
      <div className="winner-context"><h3>{live.event.title}</h3><div><EventPublicationStatus event={{ publicationState: isCorrection ? "published" : hasPublicationHistory ? "revoked" : base.draft ? "draft" : "unpublished", hasDraftResults: Boolean(base.draft) }} /></div></div>
      <p className="small">{categories?.find(category => category._id === live.event.categoryId)?.name ?? "Loading category…"}</p>
      <p className="small">Enter the approved manual points for each school. Ties share a placement; points are never assigned automatically.</p>
      {stale && <div className="event-alert" role="alert"><p>This event or its results changed in another session. Your edits are still here. Load the latest version before saving or publishing.</p><button className="button secondary" disabled={Boolean(busy)} onClick={() => { if (!dirty || confirm("Discard your unsaved changes and load the latest results?")) { load(live); setError(""); } }}>Load latest results</button></div>}
      <fieldset className="event-fields" disabled={Boolean(busy) || stale}>
        {["1", "2", "3"].map((placement, index) => {
          const placed = rows.filter(row => row.placement === placement);
          return <section className="winner-group" data-place={placement} key={placement} aria-label={`${["First", "Second", "Third"][index]} place`}>
            <header><h3><span className="winner-rank">{placement}</span>{["First", "Second", "Third"][index]} place{placed.length > 1 && <small> · Tied</small>}</h3><button className="button secondary" type="button" disabled={rows.length >= 200 || !eligible.length} onClick={() => add(placement)}>{placed.length ? "Add tie" : "Add winner"}</button></header>
            {placed.map(row => renderRow(row))}{!placed.length && <p className="small">No winner selected. This placement can be left empty.</p>}
          </section>;
        })}
        <details className="event-extra" open={rows.some(row => !["1", "2", "3"].includes(row.placement)) || undefined}><summary>Other placements & participation points</summary>{rows.filter(row => !["1", "2", "3"].includes(row.placement)).map(row => renderRow(row, true))}<button className="button secondary" type="button" disabled={rows.length >= 200} onClick={() => add("")}>Add result row</button></details>
        {isCorrection && <label className="field"><span>Reason for correction *</span><textarea required value={reason} onChange={e => { setReason(e.target.value); setConfirmation(null); }} placeholder="Explain why these official results need to change" /></label>}
      </fieldset>
      <section className="winner-impact"><h3>Official score impact</h3>
        {preview && !stale && !dirty ? <>{preview.changes.map(change => <p key={change.schoolId}><span>{schools.find(s => s._id === change.schoolId)?.name ?? "Archived school"}</span><strong>{change.oldPoints} → {change.newPoints} <small>({change.delta >= 0 ? "+" : ""}{change.delta})</small></strong></p>)}{!preview.changes.length && <p>No point changes. Placement and label changes are still included.</p>}</> : <p className="small">Save your draft to review the official school point changes.</p>}
      </section>
      {canPublish && isCorrection && <details className="event-extra"><summary>Revoke official results</summary><p className="small">Remove this event’s published points from the scoreboard. Audit history is kept. Enter a correction reason above.</p><button className="button secondary" disabled={Boolean(busy) || stale || !reason.trim()} onClick={() => setConfirmation("revoke")}>Revoke official results</button></details>}
      {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
    </div>
    <footer className="event-dialog-footer">
      {confirmation ? <div role="alert"><p>{confirmation === "publish" ? "Publish this saved revision? Official results and school standings will update immediately." : "Revoke this event’s official results and remove their points from public standings?"}</p><div className="actions"><button className="button" disabled={Boolean(busy) || stale} onClick={() => perform(confirmation)}>{busy ? "Applying…" : "Confirm"}</button><button className="button secondary" disabled={Boolean(busy)} onClick={() => setConfirmation(null)}>Go back</button></div></div> : <>
        <p className="small">{!canPublish ? "A super admin must publish official results." : stale ? "Load the latest results to continue." : !gate.ready ? gate.message : "Ready to publish the saved draft."}</p>
        <div className="actions"><button className="button secondary" disabled={Boolean(busy)} onClick={() => { if (!dirty || confirm("Discard your unsaved changes?")) onClose(); }}>Cancel</button><button className="button secondary" disabled={Boolean(busy) || stale} onClick={() => perform("save")}>{busy === "save" ? "Saving…" : "Save draft"}</button>{canPublish && <button className="button" disabled={Boolean(busy) || stale || !gate.ready} onClick={() => setConfirmation("publish")}>{isCorrection ? "Publish correction" : "Publish official results"}</button>}</div>
      </>}
    </footer>
  </EventDialog>;
}
