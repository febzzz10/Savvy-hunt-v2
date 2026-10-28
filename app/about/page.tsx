"use client";
import { Nav } from "@/components/public";
import { Load, ref } from "@/components/data";
import { useQuery } from "convex/react";
function About({ editionId }: { editionId: string }) { const settings = useQuery(ref<{ editionId: string }, { eventTitle: string; tagline?: string; contactInfo?: string } | null>("siteSettings:getPublic"), { editionId }); return settings === undefined ? <p>Loading event information…</p> : <><h1>About {settings?.eventTitle || "Savvy Hunt"}</h1><p>{settings?.tagline || "Event information will be added by the organizers."}</p>{settings?.contactInfo && <section><h2>Contact</h2><p>{settings.contactInfo}</p></section>}</>; }
export default function Page() { return <><Nav /><main className="shell"><Load>{edition => <About editionId={edition._id} />}</Load></main></>; }
