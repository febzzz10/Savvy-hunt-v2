import type { Metadata } from "next";
import {Nav,Board} from "@/components/public";
export const metadata: Metadata = { title: "Scoreboard", description: "Overall and category standings for Savvy Hunt, calculated only from officially published event results.", alternates: { canonical: "/scoreboard" } };
export default function Page(){return <><Nav/><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">Official standings</span><h1>Scoreboard</h1><p className="muted">Points from published event results. Schools with equal points share a rank.</p><Board/></main></>}
