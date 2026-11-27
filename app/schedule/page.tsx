import type { Metadata } from "next";
import Link from "next/link";
import {Nav,Schedule} from "@/components/public";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "MGM Savvy Hunt Event Schedule 2026 | MGM School", description: "See the full MGM Savvy Hunt 2026 event schedule from MGM School, Kottarakara: every event with its category, venue and live status, so you know what is on next." };
export const metadata: Metadata = { title: { absolute: META.title }, description: META.description, alternates: { canonical: "/schedule" } };
export default function Page(){return <><JsonLd data={pageSchema({ path: "/schedule", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Events", path: "/schedule" }] })} /><Nav/><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">The programme</span><h1>MGM Savvy Hunt Event Schedule 2026</h1><p className="muted">Every MGM School event in the Savvy Hunt 2026 programme, with its category, venue and status. Find an event by name, venue or category, then check the <Link href="/results">official results</Link> or the <Link href="/scoreboard">live scoreboard</Link>.</p><Schedule/></main></>}
