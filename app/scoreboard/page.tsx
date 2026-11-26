import type { Metadata } from "next";
import {Nav,Board} from "@/components/public";
import { JsonLd } from "@/components/structured-data";
import { pageSchema } from "@/lib/structured-data";

const META = { title: "Savvy Hunt Scoreboard 2026 | MGM School Standings", description: "Live Savvy Hunt 2026 scoreboard for MGM School: overall and category standings calculated only from officially published event results." };
export const metadata: Metadata = { title: { absolute: META.title }, description: META.description, alternates: { canonical: "/scoreboard" } };
export default function Page(){return <><JsonLd data={pageSchema({ path: "/scoreboard", name: META.title, description: META.description, crumbs: [{ name: "Home", path: "/" }, { name: "Scoreboard", path: "/scoreboard" }] })} /><Nav/><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">Official standings</span><h1>Scoreboard</h1><p className="muted">Points from published event results. Schools with equal points share a rank.</p><Board/></main></>}
