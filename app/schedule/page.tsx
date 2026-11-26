import type { Metadata } from "next";
import {Nav,Schedule} from "@/components/public";
export const metadata: Metadata = { title: "Event schedule", description: "Browse every Savvy Hunt event by category, venue and status, and follow the official programme for participating schools.", alternates: { canonical: "/schedule" } };
export default function Page(){return <><Nav/><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">The programme</span><h1>Event schedule</h1><p className="muted">Find an event by name, venue, date or category.</p><Schedule/></main></>}
