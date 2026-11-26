import type { Metadata } from "next";
import {Nav,Schedule} from "@/components/public";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "MGM School Events", description: "See every event in the Savvy Hunt 2026 programme at MGM School, Kottarakara: categories, venues and statuses for participating schools." };
export const metadata: Metadata = { ...META, alternates: { canonical: "/schedule" } };
export default function Page(){return <><JsonLd data={pageSchema({ path: "/schedule", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Events", path: "/schedule" }] })} /><Nav/><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">The programme</span><h1>Event schedule</h1><p className="muted">Find an event by name, venue, date or category.</p><Schedule/></main></>}
