import type { Metadata } from "next";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "Organizing Team | Savvy Hunt, MGM School Kottarakara", description: "Meet the developers, student coordinators, jury and faculty coordinators who run Savvy Hunt at MGM School Kottarakara." };
export const metadata: Metadata = { title: { absolute: META.title }, description: META.description, alternates: { canonical: "/team" } };

export default function Layout({ children }: { children: React.ReactNode }) { return <><JsonLd data={pageSchema({ path: "/team", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Team", path: "/team" }] })} />{children}</>; }
