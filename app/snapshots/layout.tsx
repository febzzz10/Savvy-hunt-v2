import type { Metadata } from "next";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "MGM Savvy Hunt 2026 Photos | Event Snapshots", description: "Browse MGM Savvy Hunt 2026 photos from MGM School, Kottarakara: approved event snapshots, shared by the organizers with permission from participating schools." };
export const metadata: Metadata = { title: { absolute: META.title }, description: META.description, alternates: { canonical: "/snapshots" } };

export default function Layout({ children }: { children: React.ReactNode }) { return <><JsonLd data={pageSchema({ path: "/snapshots", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Snapshots", path: "/snapshots" }] })} />{children}</>; }
