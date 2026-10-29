"use client";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Load, mut, ref } from "@/components/data";
import { friendlyResultsError, publishGate, type EditorRow } from "@/lib/results-editor";

type Row = EditorRow;
type AdminResult = { event: { title: string; activePublishedRevisionId?: string }; draft?: { _id: string; changeReason?: string; draftVersion?: number }; draftEntries: Row[]; officialEntries: Row[] };
type PublishResult = { status: "published" | "already_published" | "unchanged" };

export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <><h1>Event results</h1><Load>{edition => <Editor eventId={id} editionId={edition._id} />}</Load></>;
}

function Editor({ eventId, editionId }: { eventId: string; editionId: string }) {
  const data = useQuery(ref<{ eventId: string }, AdminResult>("results:getAdminByEvent"), { eventId });
  const schools = useQuery(ref<{ editionId: string }, Array<{ _id: string; name: string }>>("schools:listAdmin"), { editionId });
  const self = useQuery(ref<Record<string, never>, { role: string } | null>("admins:getSelf"), {});
  if (!data || !schools || !self) return <p>Loading result editor…</p>;
  return <EditorForm key={`${data.draft?._id ?? "new"}:${data.draft?.draftVersion ?? 0}:${data.event.activePublishedRevisionId ?? "none"}`} eventId={eventId} data={data} schools={schools} canPublish={self.role === "super_admin"} />;
}

function EditorForm({ eventId, data, schools, canPublish }: { eventId: string; data: AdminResult; schools: Array<{ _id: string; name: string }>; canPublish: boolean }) {
  const save = useMutation(mut<{ eventId: string; entries: Row[]; reason?: string; expectedDraftVersion?: number }, string>("results:saveDraft"));
  const publish = useMutation(mut<{ eventId: string; draftRevisionId: string; expectedActiveRevisionId: string | null; expectedDraftVersion: number }, PublishResult>("results:publish"));
  const revoke = useMutation(mut<{ eventId: string; reason: string; expectedActiveRevisionId: string | null }, unknown>("results:revoke"));
  const isCorrection = Boolean(data.event.activePublishedRevisionId);
  const savedRows: Row[] = data.draftEntries.map(row => ({ schoolId: row.schoolId, points: row.points, placement: row.placement, entryLabel: row.entryLabel }));
  const savedReason = data.draft?.changeReason ?? "";
  const [rows, setRows] = useState<Row[]>(() => (data.draft ? data.draftEntries : data.officialEntries).map(row => ({ schoolId: row.schoolId, points: row.points, placement: row.placement, entryLabel: row.entryLabel })));
  const [reason, setReason] = useState(savedReason), [notice, setNotice] = useState("");
  const preview = useQuery(ref<{ eventId: string; draftRevisionId: string }, { expectedActiveRevisionId: string | null; expectedDraftVersion: number; changes: Array<{ schoolId: string; oldPoints: number; newPoints: number; delta: number }> }>("results:preview"), data.draft ? { eventId, draftRevisionId: data.draft._id } : "skip");
  const gate = publishGate({ isCorrection, draftExists: Boolean(data.draft), hasPreview: Boolean(preview), rows, savedRows, officialRows: data.officialEntries, reason, savedReason });

  async function handleSave() {
    try {
      await save({ eventId, entries: rows, reason: isCorrection ? reason : undefined, expectedDraftVersion: data.draft?.draftVersion });
      setNotice(isCorrection ? "Correction draft saved. Public results are unchanged." : "Draft saved. Public results are unchanged.");
    } catch (error) { setNotice(friendlyResultsError(error)); }
  }

  async function handlePublish() {
    if (!data.draft || !preview || !gate.ready) { setNotice(gate.message); return; }
    if (!confirm(isCorrection ? "Publish these corrections to the official results?" : "Publish these official results?")) return;
    try {
      const result = await publish({ eventId, draftRevisionId: data.draft._id, expectedActiveRevisionId: preview.expectedActiveRevisionId, expectedDraftVersion: preview.expectedDraftVersion });
      setNotice(result.status === "unchanged" ? "No changes to publish. The official results are already current." : "Official results published.");
    } catch (error) { setNotice(friendlyResultsError(error)); }
  }

  async function handleRevoke() {
    if (!data.event.activePublishedRevisionId) return;
    if (!reason.trim()) { setNotice("Enter a reason for this correction before revoking official results."); return; }
    if (!confirm("Revoke official results? Points are removed from the public scoreboard and the revision history is kept.")) return;
    try {
      await revoke({ eventId, reason, expectedActiveRevisionId: data.event.activePublishedRevisionId ?? null });
      setNotice("Official results revoked.");
    } catch (error) { setNotice(friendlyResultsError(error)); }
  }

  return <><h2>{data.event.title}</h2>
    <p>{isCorrection ? "Official results are live. Saving a draft creates a private correction; publishing applies only the differences." : "Results are not official yet. Save a draft, then publish the first revision."}</p>
    {rows.map((row, index) => <div className="card" key={index}>
      <label className="field"><span>School</span><select aria-label="School" value={row.schoolId} onChange={event => setRows(rows.map((item, position) => position === index ? { ...item, schoolId: event.target.value } : item))}><option value="">Select school</option>{schools?.map(school => <option key={school._id} value={school._id}>{school.name}</option>)}</select></label>
      <label className="field"><span>Manual points</span><input type="number" min="0" step="1" value={row.points} onChange={event => setRows(rows.map((item, position) => position === index ? { ...item, points: Number(event.target.value) } : item))} /></label>
      <label className="field"><span>Placement (optional)</span><input type="number" min="1" value={row.placement ?? ""} onChange={event => setRows(rows.map((item, position) => position === index ? { ...item, placement: event.target.value ? Number(event.target.value) : undefined } : item))} /></label>
      <label className="field"><span>Entry label (optional)</span><input value={row.entryLabel ?? ""} onChange={event => setRows(rows.map((item, position) => position === index ? { ...item, entryLabel: event.target.value } : item))} /></label>
      <button className="button secondary" onClick={() => setRows(rows.filter((_, position) => position !== index))}>Remove row</button>
    </div>)}
    <div className="actions"><button className="button secondary" onClick={() => setRows([...rows, { schoolId: "", points: 0 }])}>Add result row</button><button className="button" onClick={handleSave}>Save draft</button></div>
    <section className="card">
      <h3>{isCorrection ? "Publish a correction" : "Publish first official results"}</h3>
      <p>{isCorrection ? "A reason is required. Save it with the draft before publishing the corrected results." : "No official results exist for this event yet. Publishing makes this draft the first official revision."}</p>
      {isCorrection && <label className="field"><span>Reason for correction *</span><input required aria-describedby="correction-reason-help" placeholder="e.g. Judge corrected the placement" value={reason} onChange={event => setReason(event.target.value)} /><small id="correction-reason-help">Required for corrections and revocations. Saved with the draft.</small></label>}
      {preview ? <>{preview.changes.map(change => <p key={change.schoolId}>{schools?.find(school => school._id === change.schoolId)?.name}: {change.oldPoints} → {change.newPoints} ({change.delta >= 0 ? "+" : ""}{change.delta})</p>)}{!preview.changes.length && <p>No point changes. Placement or entry label updates will still be published.</p>}</> : <p>Save a draft to see the publication preview.</p>}
      {canPublish ? <><button className="button" disabled={!gate.ready} onClick={handlePublish}>{isCorrection ? "Publish correction" : "Publish official results"}</button>{!gate.ready && <p role="status">{gate.message}</p>}</> : <p>A super admin must publish official results.</p>}
    </section>
    {canPublish && isCorrection && <section className="card"><h3>Revoke official results</h3><p>Revoking removes these points from the public scoreboard. The revision history and audit log are kept.</p><button className="button secondary" disabled={!reason.trim()} onClick={handleRevoke}>Revoke official result</button></section>}
    <p role="status">{notice}</p></>;
}
