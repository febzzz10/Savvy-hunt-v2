import type { Doc } from "@/convex/_generated/dataModel";
export type School = Doc<"schools">;
export type SchoolValues = { name: string; code: string; status: "active" | "archived" };
export function validateSchool(values: SchoolValues, schools: School[], editingId?: string) {
  const errors: { name?: string; code?: string } = {};
  const name = values.name.trim(), code = values.code.trim().toUpperCase();
  if (!name) errors.name = "Enter the school name.";
  else if (name.length > 120) errors.name = "Keep the school name within 120 characters.";
  else if (schools.some(s => s._id !== editingId && s.name.toLowerCase() === name.toLowerCase())) errors.name = "A school with this name already exists.";
  if (code.length > 24) errors.code = "Keep the code within 24 characters.";
  else if (code && schools.some(s => s._id !== editingId && s.code?.toUpperCase() === code)) errors.code = "This code belongs to another school.";
  return errors;
}
export function filterSchools(schools: School[], search: string, status: string, sort: string) {
  const query = search.trim().toLowerCase();
  return schools.filter(s => (!status || s.status === status) && `${s.name} ${s.code ?? ""}`.toLowerCase().includes(query)).sort((a, b) =>
    sort === "updated" ? b.updatedAt - a.updatedAt || a.name.localeCompare(b.name) : sort === "za" ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
}
export function schoolError(cause: unknown) {
  const message = cause instanceof Error ? cause.message : String(cause);
  if (/already exists/i.test(message)) return "That school name or code is already in use. Check both fields and try again.";
  if (/UNAUTH|FORBIDDEN/i.test(message)) return "Your admin access could not be confirmed. Sign in again and retry.";
  if (/School missing/i.test(message)) return "This school is no longer available. Refresh the page to load the current list.";
  return "We couldn’t save this school. Check your connection and try again. Your entries are still here.";
}
