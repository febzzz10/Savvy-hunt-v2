import type { Metadata } from "next";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "Savvy Hunt Results 2026 | MGM School", description: "Official Savvy Hunt 2026 results from MGM School: published placements, winners and points for every completed event." };
export const metadata: Metadata = { title: { absolute: META.title }, description: META.description, alternates: { canonical: "/results" } };

export default function Layout({ children }: { children: React.ReactNode }) { return <><JsonLd data={pageSchema({ path: "/results", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Results", path: "/results" }] })} />{children}</>; }
