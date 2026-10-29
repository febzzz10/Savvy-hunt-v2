import Link from "next/link";
import { Nav } from "@/components/public";
export default function NotFound() { return <><Nav /><main id="main-content" tabIndex={-1} className="shell"><span className="eyebrow">Page not found</span><h1>Let’s get you back to the event.</h1><p>This page is unavailable. Explore the programme or return to the event hub.</p><div className="actions"><Link className="button" href="/">Back to Savvy Hunt</Link><Link className="button secondary" href="/schedule">Explore the schedule</Link></div></main></>; }
