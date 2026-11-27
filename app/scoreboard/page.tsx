import type { Metadata } from "next";
import Link from "next/link";
import {Nav,Board} from "@/components/public";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "Savvy Hunt Live Scoreboard 2026 | MGM Points Table", description: "Follow the Savvy Hunt 2026 live scoreboard: MGM School points table with school-wise rankings, overall and category standings from official published results." };
export const metadata: Metadata = { title: { absolute: META.title }, description: META.description, alternates: { canonical: "/scoreboard" } };
export default function Page(){return <><JsonLd data={pageSchema({ path: "/scoreboard", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Scoreboard", path: "/scoreboard" }] })} /><Nav/><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">Official standings</span><h1>Savvy Hunt Live Scoreboard 2026</h1><p className="muted">The MGM School points table for Savvy Hunt 2026 in Kottarakara, with school-wise points and rankings built from published event results. Schools with equal points share a rank. Read the full <Link href="/results">event-wise results</Link> or see the <Link href="/schedule">event schedule</Link>.</p><Board/></main></>}
