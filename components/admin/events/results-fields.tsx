import type { DraftRow } from "@/lib/results-editor";

type SchoolOption = { _id: string; name: string; status?: string };

export function ResultFields({ row, schools, onChange, onNameChange, schoolLabel = "School", pointsLabel = "Manual points", isSchoolDisabled, other = false }: {
  row: DraftRow;
  schools: SchoolOption[];
  onChange: (patch: Partial<DraftRow>) => void;
  onNameChange: (value: string) => void;
  schoolLabel?: string;
  pointsLabel?: string;
  isSchoolDisabled?: (schoolId: string) => boolean;
  other?: boolean;
}) {
  return <>
    <label className="field winner-school"><span>{schoolLabel}</span><select required value={row.schoolId} onChange={event => onChange({ schoolId: event.target.value })}><option value="">Select school</option>{schools.map(school => <option key={school._id} value={school._id} disabled={isSchoolDisabled?.(school._id)}>{school.name}{school.status !== "active" ? " (archived)" : ""}</option>)}</select></label>
    <label className="field"><span>{pointsLabel}</span><input type="number" required min="0" step="1" value={row.points} onChange={event => onChange({ points: event.target.value })} /></label>
    <label className="field winner-entry-label"><span>Entry / team label</span><input value={row.entryLabel} onChange={event => onChange({ entryLabel: event.target.value })} placeholder="Optional" /><small>Stored for organizers; not shown publicly.</small></label>
    <label className="field winner-name"><span>Participant Name</span><input value={row.displayParticipantName} onChange={event => onNameChange(event.target.value)} placeholder="Optional" /></label>
    {other && <label className="field winner-placement"><span>Placement (optional)</span><input type="number" min="1" step="1" value={row.placement} onChange={event => onChange({ placement: event.target.value })} /></label>}
    <label className="field winner-approval"><span>Approve name for public display</span><input type="checkbox" checked={row.namePublishingApproved} disabled={!row.displayParticipantName.trim()} onChange={event => onChange({ namePublishingApproved: event.target.checked })} /></label>
  </>;
}
