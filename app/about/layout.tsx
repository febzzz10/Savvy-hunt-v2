import type { Metadata } from "next";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "About Savvy Hunt 2026 | MGM School, Kottarakara", description: "Learn about Savvy Hunt 2026, the inter-school competition hosted by MGM School, Kottarakara: its event categories and how official results are published." };
export const metadata: Metadata = { title: { absolute: META.title }, description: META.description, alternates: { canonical: "/about" } };

export default function Layout({ children }: { children: React.ReactNode }) { return <><JsonLd data={pageSchema({ path: "/about", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "About", path: "/about" }] })} />{children}</>; }
