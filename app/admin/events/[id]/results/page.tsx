"use client";
import { use, useRef, useState } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { Load, mut, ref } from "@/components/data";
import { EventPublicationStatus, useUnsavedChanges } from "@/components/admin/events/shared";
import { ResultFields } from "@/components/admin/events/results-fields";
import { draftRowsFromEditor, editorRowsFromDraft, friendlyResultsError, normalizeEditorRows, participantNameChange, publishGate, sameResultRows, validateDraftRows, type DraftRow, type EditorRow } from "@/lib/results-editor";
import "./results.css";

type AdminEvent = { title: string; editionId: string; updatedAt: number; participatingSchoolIds?: string[]; activePublishedRevisionId?: string };
type AdminResult = { event: AdminEvent; draft?: { _id: string; changeReason?: string; draftVersion?: number }; draftEntries: EditorRow[]; officialEntries: EditorRow[]; revisions: Array<{ status: string }> };
type School = { _id: string; name: string; status?: string };
type Preview = { expectedActiveRevisionId: string | null; expectedDraftVersion: number; changes: Array<{ schoolId: string; oldPoints: number; newPoints: number; delta: number }> };
type PublishResult = { status: "published" | "already_published" | "unchanged" };

const revisionKey = (data: AdminResult) => `${data.draft?._id ?? "none"}:${data.draft?.draftVersion ?? 0}:${data.event.activePublishedRevisionId ?? "none"}:${data.event.updatedAt}`;
const sourceRows = (data: AdminResult) => data.draft ? data.draftEntries : data.officialEntries;
const entries = (rows: DraftRow[]) => editorRowsFromDraft(rows);

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <><h1>Event results</h1><Load>{edition => <Editor eventId={id} editionId={edition._id} />}</Load></>;
}

function Editor({ eventId, editionId }: { eventId: string; editionId: string }) {
  const data = useQuery(ref<{ eventId: string }, AdminResult>("results:getAdminByEvent"), { eventId });
  const schools = useQuery(ref<{ editionId: string }, School[]>("schools:listAdmin"), { editionId });
  const self = useQuery(ref<Record<string, never>, { role: string } | null>("admins:getSelf"), {});
  if (!data || !schools || !self) return <p>Loading result editor…</p>;
  return <EditorForm eventId={eventId} live={data} schools={schools} canPublish={self.role === "super_admin"} />;
}

function EditorForm({ eventId, live, schools, canPublish }: { eventId: string; live: AdminResult; schools: School[]; canPublish: boolean }) {
  const client = useConvex();
  const save = useMutation(mut<{ eventId: string; entries: EditorRow[]; reason?: string; expectedDraftVersion?: number }, string>("results:saveDraft"));
  const publish = useMutation(mut<{ eventId: string; draftRevisionId: string; expectedActiveRevisionId: string | null; expectedDraftVersion: number }, PublishResult>("results:publish"));
  const revoke = useMutation(mut<{ eventId: string; reason: string; expectedActiveRevisionId: string | null }, unknown>("results:revoke"));
  const [base, setBase] = useState(live);
  const [rows, setRows] = useState(() => draftRowsFromEditor(sourceRows(live)));
  const [reason, setReason] = useState(live.draft?.changeReason ?? "");
  const [busy, setBusy] = useState(""), [notice, setNotice] = useState(""), [error, setError] = useState("");
  const nextKey = useRef(rows.length);
  const stale = revisionKey(base) !== revisionKey(live);
  const isCorrection = Boolean(base.event.activePublishedRevisionId);
  const initialRows = normalizeEditorRows(sourceRows(base));
  const currentRows = entries(rows);
  const dirty = !sameResultRows(currentRows, initialRows) || reason !== (base.draft?.changeReason ?? "");
  useUnsavedChanges(dirty);
  const preview = useQuery(ref<{ eventId: string; draftRevisionId: string }, Preview>("results:preview"), live.draft ? { eventId, draftRevisionId: live.draft._id } : "skip");
  const gate = publishGate({ isCorrection, draftExists: Boolean(base.draft), hasPreview: Boolean(preview) && !stale, rows: currentRows, savedRows: initialRows, officialRows: normalizeEditorRows(base.officialEntries), reason, savedReason: base.draft?.changeReason ?? "" });
  const eligible = schools.filter(school => (school.status === "active" || base.officialEntries.some(row => row.schoolId === school._id)) && (!base.event.participatingSchoolIds?.length || base.event.participatingSchoolIds.includes(school._id)));
  const hasPublicationHistory = base.revisions.some(revision => ["published", "superseded", "revoked"].includes(revision.status));

  function load(data: AdminResult) {
    const loaded = draftRowsFromEditor(sourceRows(data));
    setBase(data);
    setRows(loaded);
    nextKey.current = loaded.length;
    setReason(data.draft?.changeReason ?? "");
    setError("");
  }
  function update(key: string, patch: Partial<DraftRow>) { setRows(rows.map(row => row.key === key ? { ...row, ...patch } : row)); }
  function updateName(key: string, value: string) { setRows(rows.map(row => row.key === key ? participantNameChange(row, value) : row)); }
  function add() { setRows([...rows, { key: `new-${nextKey.current++}`, schoolId: "", points: "", placement: "", entryLabel: "", displayParticipantName: "", namePublishingApproved: false }]); }
  function validate() {
    const invalid = validateDraftRows(rows, { eligibleSchoolIds: new Set(eligible.map(school => school._id)), initialRows });
    if (invalid) return invalid;
    if (isCorrection && !reason.trim()) return "Enter a reason for this correction.";
    return "";
  }
  async function perform(action: "save" | "publish" | "revoke") {
    if (busy || stale) return;
    const invalid = action === "revoke" ? (!reason.trim() ? "Enter a reason before revoking results." : "") : validate();
    if (invalid) { setError(invalid); return; }
    if (action === "publish" && (!gate.ready || !base.draft || !preview)) { setError(gate.message); return; }
    if (action === "publish" && !confirm(isCorrection ? "Publish these corrections to the official results?" : "Publish these official results?")) return;
    if (action === "revoke" && !confirm("Revoke official results? Points are removed from the public scoreboard and the revision history is kept.")) return;
    setBusy(action); setError(""); setNotice("");
    try {
      if (action === "save") {
        await save({ eventId, entries: currentRows, reason: isCorrection ? reason.trim() : undefined, expectedDraftVersion: base.draft?.draftVersion });
        setNotice(isCorrection ? "Correction draft saved. Public results are unchanged." : "Draft saved. Public results are unchanged.");
      } else if (action === "publish" && base.draft && preview) {
        const result = await publish({ eventId, draftRevisionId: base.draft._id, expectedActiveRevisionId: preview.expectedActiveRevisionId, expectedDraftVersion: preview.expectedDraftVersion });
        setNotice(result.status === "unchanged" ? "No changes to publish. The official results are already current." : "Official results published. School totals have updated.");
      } else if (action === "revoke") {
        await revoke({ eventId, reason: reason.trim(), expectedActiveRevisionId: base.event.activePublishedRevisionId ?? null });
        setNotice("Official results revoked. The revision history is kept.");
      }
      load(await client.query(ref<{ eventId: string }, AdminResult>("results:getAdminByEvent"), { eventId }));
    } catch (cause) { setError(friendlyResultsError(cause)); }
    finally { setBusy(""); }
  }

  return <div className="result-editor">
    <header className="result-editor-head">
      <div><p className="eyebrow">{isCorrection ? "Official results" : "First publication"}</p><h2>{base.event.title}</h2><p>{isCorrection ? "Official results are live. Saving a draft creates a private correction; publishing applies only the differences." : "Results are not official yet. Save a draft, then publish the first revision."}</p></div>
      <EventPublicationStatus event={{ publicationState: isCorrection ? "published" : hasPublicationHistory ? "revoked" : base.draft ? "draft" : "unpublished", hasDraftResults: Boolean(base.draft) }} />
    </header>
    <p className="small">Enter the approved manual points for each school. Points are never assigned automatically.</p>
    {stale && <div className="event-alert" role="alert"><p>This event or its results changed in another session. Your edits are still here. Load the latest version before saving or publishing.</p><button className="button secondary" disabled={Boolean(busy)} onClick={() => { if (!dirty || confirm("Discard your unsaved changes and load the latest results?")) load(live); }}>Load latest results</button></div>}
    <fieldset className="event-fields" disabled={Boolean(busy) || stale}>
      <div className="result-editor-rows">
        {rows.map(row => <div className="card winner-entry" key={row.key}>
          <ResultFields row={row} schools={eligible} onChange={patch => update(row.key, patch)} onNameChange={value => updateName(row.key, value)} other isSchoolDisabled={schoolId => schoolId !== row.schoolId && rows.some(item => item.schoolId === schoolId)} />
          <button type="button" className="button secondary" onClick={() => setRows(rows.filter(item => item.key !== row.key))}>Remove row</button>
        </div>)}
        {!rows.length && <p className="empty-state">No result rows yet. Add a school to begin.</p>}
      </div>
      <div className="actions"><button type="button" className="button secondary" disabled={rows.length >= 200} onClick={add}>Add result row</button><button type="button" className="button" onClick={() => perform("save")}>{busy === "save" ? "Saving…" : "Save draft"}</button></div>
    </fieldset>
    <section className="card result-publication">
      <h3>Publication preview</h3>
      <p>{isCorrection ? "A reason is required. Save it with the draft before publishing the corrected results." : "No official results exist for this event yet. Publishing makes this draft the first official revision."}</p>
      {isCorrection && <label className="field"><span>Correction or revocation reason *</span><input required aria-label="Correction or revocation reason" aria-describedby="correction-reason-help" placeholder="e.g. Judge corrected the placement" value={reason} onChange={event => { setReason(event.target.value); setError(""); }} /><small id="correction-reason-help">Required for corrections and revocations. Saved with the draft.</small></label>}
      {preview && !stale ? <>
        {preview.changes.map(change => <p key={change.schoolId}><span>{schools.find(school => school._id === change.schoolId)?.name ?? "Archived school"}</span><strong>{change.oldPoints} → {change.newPoints} <small>({change.delta >= 0 ? "+" : ""}{change.delta})</small></strong></p>)}
        {!preview.changes.length && <p>No point changes. Placement, participant name, or entry label updates will still be published.</p>}
      </> : <p>Save a draft to see the publication preview.</p>}
      {canPublish ? <><button className="button" disabled={Boolean(busy) || stale || !gate.ready} onClick={() => perform("publish")}>{busy === "publish" ? "Publishing…" : isCorrection ? "Publish correction" : "Publish official results"}</button>{!gate.ready && <p role="status">{stale ? "Load the latest results to continue." : gate.message}</p>}</> : <p>A super admin must publish official results.</p>}
    </section>
    {canPublish && isCorrection && <section className="card result-publication"><h3>Revoke official results</h3><p>Revoking removes these points from the public scoreboard. The revision history and audit log are kept.</p><button className="button secondary" disabled={Boolean(busy) || stale || !reason.trim()} onClick={() => perform("revoke")}>Revoke official result</button></section>}
    {error && <p className="error" role="alert">{error}</p>}{notice && <p className="success" role="status">{notice}</p>}
  </div>;
}
