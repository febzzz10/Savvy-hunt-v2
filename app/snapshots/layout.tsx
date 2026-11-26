import type { Metadata } from "next";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "MGM School Snapshots", description: "Approved photographs from Savvy Hunt 2026 events at MGM School, published by organizers with permission from participating schools." };
export const metadata: Metadata = { title: META.title, description: META.description, alternates: { canonical: "/snapshots" } };

export default function Layout({ children }: { children: React.ReactNode }) { return <><JsonLd data={pageSchema({ path: "/snapshots", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Snapshots", path: "/snapshots" }] })} />{children}</>; }
