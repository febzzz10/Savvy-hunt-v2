import type { Doc } from "@/convex/_generated/dataModel";
export type School = Doc<"schools">;
export type SchoolValues = { name: string };
export function validateSchool(values: SchoolValues, schools: School[], editingId?: string) {
  const errors: { name?: string } = {};
  const name = values.name.trim();
  if (!name) errors.name = "Enter the school name.";
  else if (name.length > 120) errors.name = "Keep the school name within 120 characters.";
  else if (schools.some(s => s._id !== editingId && s.name.toLowerCase() === name.toLowerCase())) errors.name = "A school with this name already exists.";
  return errors;
}
export function filterSchools(schools: School[], search: string, sort: string, points?: ReadonlyMap<string, number>) {
  const query = search.trim().toLowerCase();
  const score = (school: School) => points?.get(school._id) ?? 0;
  return schools.filter(s => s.name.toLowerCase().includes(query)).sort((a, b) =>
    sort === "points" ? score(b) - score(a) || a.name.localeCompare(b.name) : sort === "updated" ? b.updatedAt - a.updatedAt || a.name.localeCompare(b.name) : sort === "za" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
}
export function schoolError(cause: unknown, action: "save" | "delete" = "save") {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/cannot be deleted|published results or scoreboard history/i.test(message)) return "This school has published results or scoreboard history and cannot be deleted. Its official records are retained.";
  if (/STALE_SCHOOL|changed in another session/i.test(message)) return "This school changed in another session. Close this dialog and reopen it to load the latest details.";
  if (/already exists/i.test(message)) return "That school name is already in use.";
  if (/UNAUTH|FORBIDDEN/i.test(message)) return "Your admin access could not be confirmed. Sign in again and retry.";
  if (/School missing/i.test(message)) return "This school is no longer available. Refresh the page to load the current list.";
  return action === "delete" ? "We couldn't delete this school. Check your connection and try again." : "We couldn't save this school. Check your connection and try again. Your entries are still here.";
}
