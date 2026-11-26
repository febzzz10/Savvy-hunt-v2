// Organizing team shown on /team. Edit this file to update names, roles and photos.
// `photo` is a path under /public (for example "/images/team/raihan.jpg"); without one, initials are shown.

export type TeamMember = { name: string; role?: string; photo?: string; subtitle?: string };

export const developers: TeamMember[] = [
  { name: "Adeena Ali", role: "Lead developer", subtitle: "Media Club incharge", photo: "/images/core%20dev/adeenafeb.jpg" },
];

export const studentCoordinators: TeamMember[] = [
  { name: "Kishore V N", role: "Coordinator & Media Club incharge" },
  { name: "Abel John George", role: "Coordinator" },
];

export const jury: string[] = ["Mrs. Beena Jacob", "Mrs. Krishna P Nair", "Mrs. Uma V", "Mrs. Julie Koshy"];

export const mediaClub: string[] = ["Alvin Shiju", "Aadinath M", "Kashinath M", "Jyothish J"];

export const facultyCoordinators: string[] = [
  "Mrs. Nisha Pillai", "Mrs. Radha Surendran", "Mrs. Thara", "Mrs. Soumya R",
  "Mrs. Bismin P S", "Mrs. Devu R Unnithan", "Mr. Daniel V Mathew",
];

export const initials = (name: string) =>
  name.replace(/^(Mrs?|Ms|Dr)\.\s*/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
