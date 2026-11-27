import type { Metadata } from "next";
import { JsonLd } from "@/components/structured-data";
import { faqItems, pageSchema } from "@/lib/structured-data";

const META = { title: "Savvy Hunt Results 2026 | MGM School Winners", description: "Check official Savvy Hunt 2026 results from MGM School, Kottarakara: event-wise winners, placements and points by school, updated as results are published." };
export const metadata: Metadata = { title: { absolute: META.title }, description: META.description, alternates: { canonical: "/results" } };

export default function Layout({ children }: { children: React.ReactNode }) { return <><JsonLd data={pageSchema({ path: "/results", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Results", path: "/results" }], faq: faqItems() })} />{children}</>; }
