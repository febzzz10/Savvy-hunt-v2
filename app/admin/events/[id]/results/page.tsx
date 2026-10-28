"use client";
import { use, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Load, mut, ref } from "@/components/data";

type Row = { schoolId: string; points: number; placement?: number; entryLabel?: string };
type AdminResult = { event: { title: string; activePublishedRevisionId?: string }; draft?: { _id: string; changeReason?: string; draftVersion?: number }; draftEntries: Row[]; officialEntries: Row[] };

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
  const publish = useMutation(mut<{ eventId: string; draftRevisionId: string; expectedActiveRevisionId: string | null; expectedDraftVersion: number }, unknown>("results:publish"));
  const revoke = useMutation(mut<{ eventId: string; reason: string; expectedActiveRevisionId: string | null }, unknown>("results:revoke"));
  const [rows, setRows] = useState<Row[]>(() => (data.draft ? data.draftEntries : data.officialEntries).map(row => ({ schoolId: row.schoolId, points: row.points, placement: row.placement, entryLabel: row.entryLabel })));
  const [reason, setReason] = useState(data.draft?.changeReason ?? ""), [notice, setNotice] = useState("");
  const preview = useQuery(ref<{ eventId: string; draftRevisionId: string }, { expectedActiveRevisionId: string | null; expectedDraftVersion: number; changes: Array<{ schoolId: string; oldPoints: number; newPoints: number; delta: number }> }>("results:preview"), data?.draft ? { eventId, draftRevisionId: data.draft._id } : "skip");
  const savedRows = data.draftEntries.map(row => ({ schoolId: row.schoolId, points: row.points, placement: row.placement, entryLabel: row.entryLabel }));
  const readyToPublish = Boolean(data.draft && preview && JSON.stringify(rows) === JSON.stringify(savedRows));
  return <><h2>{data.event.title}</h2><p>{data.event.activePublishedRevisionId ? "Official results are live. Save a private correction draft to change them." : "Results pending publication."}</p>
    <label className="field"><span>Correction or revocation reason</span><input value={reason} onChange={event => setReason(event.target.value)} /></label>
    {rows.map((row, index) => <div className="card" key={index}>
      <label className="field"><span>School</span><select aria-label="School" value={row.schoolId} onChange={event => setRows(rows.map((item, position) => position === index ? { ...item, schoolId: event.target.value } : item))}><option value="">Select school</option>{schools?.map(school => <option key={school._id} value={school._id}>{school.name}</option>)}</select></label>
      <label className="field"><span>Manual points</span><input type="number" min="0" step="1" value={row.points} onChange={event => setRows(rows.map((item, position) => position === index ? { ...item, points: Number(event.target.value) } : item))} /></label>
      <label className="field"><span>Placement (optional)</span><input type="number" min="1" value={row.placement ?? ""} onChange={event => setRows(rows.map((item, position) => position === index ? { ...item, placement: event.target.value ? Number(event.target.value) : undefined } : item))} /></label>
      <label className="field"><span>Entry label (optional)</span><input value={row.entryLabel ?? ""} onChange={event => setRows(rows.map((item, position) => position === index ? { ...item, entryLabel: event.target.value } : item))} /></label>
      <button className="button secondary" onClick={() => setRows(rows.filter((_, position) => position !== index))}>Remove row</button>
    </div>)}
    <div className="actions"><button className="button secondary" onClick={() => setRows([...rows, { schoolId: "", points: 0 }])}>Add result row</button><button className="button" onClick={async () => { try { await save({ eventId, entries: rows, reason, expectedDraftVersion: data.draft?.draftVersion }); setNotice("Draft saved. Public totals are unchanged."); } catch (error) { setNotice(String(error)); } }}>Save draft</button></div>
    {preview && <div className="card"><h3>Publication preview</h3>{preview.changes.map(change => <p key={change.schoolId}>{schools?.find(school => school._id === change.schoolId)?.name}: {change.oldPoints} → {change.newPoints} ({change.delta >= 0 ? "+" : ""}{change.delta})</p>)}{canPublish ? <button className="button" disabled={!readyToPublish} onClick={async () => { if (!data.draft || !confirm("Publish these official results?")) return; try { await publish({ eventId, draftRevisionId: data.draft._id, expectedActiveRevisionId: preview.expectedActiveRevisionId, expectedDraftVersion: preview.expectedDraftVersion }); setNotice("Official results published."); } catch (error) { setNotice(String(error)); } }}>Publish official results</button> : <p>A super admin must publish official results.</p>}{canPublish && !readyToPublish && <p>Save the current draft before publishing.</p>}</div>}
    {canPublish && data.event.activePublishedRevisionId && <button className="button secondary" onClick={async () => { if (!reason.trim() || !confirm("Revoke official results?")) return; try { await revoke({ eventId, reason, expectedActiveRevisionId: data.event.activePublishedRevisionId ?? null }); setNotice("Results revoked."); } catch (error) { setNotice(String(error)); } }}>Revoke official result</button>}<p role="status">{notice}</p></>;
}
