"use client";
import Link from "next/link";
import { Nav } from "@/components/public";
import { Load, ref } from "@/components/data";
import { SectionHeading } from "@/components/editorial";
import { GalleryPhoto } from "@/components/gallery-photo";
import { Icon, Skeleton } from "@/components/ui";
import { useQuery } from "convex/react";
function About({ editionId }: { editionId: string }) {
  const settings = useQuery(ref<{ editionId: string }, { eventTitle: string; tagline?: string; contactInfo?: string } | null>("siteSettings:getPublic"), { editionId });
  const categories = useQuery(ref<{ editionId: string }, { _id: string; name: string; slug: string; isActive: boolean }[]>("categories:listCurrent"), { editionId });
  const photos = useQuery(ref<{ editionId: string }, { _id: string; altText: string; caption?: string }[]>("gallery:listApproved"), { editionId });
  const photo = photos?.[0];
  return <>
    <span className="eyebrow">Talent, teamwork & school spirit</span><h1>About {settings?.eventTitle || "Savvy Hunt"}</h1>
    <div className="about-layout"><div><p className="about-intro">A shared space for school events, official results and the moments in between.</p>
      <section><SectionHeading number="The event" title="A place to come together" />{settings === undefined ? <Skeleton /> : <p>{settings?.tagline || "Savvy Hunt brings the school-event programme together in one place. Discover events, follow participating schools and celebrate achievements as official results are published."}</p>}</section>
      <section><SectionHeading number="The results" title="Every achievement, accounted for" /><p>Standings use published event results. Equal point totals share a rank; draft results do not appear in the public standings.</p><Link className="text-link" href="/scoreboard">Explore the scoreboard <Icon name="arrow" /></Link></section>
    </div><aside className="about-visual">{photo ? <figure><GalleryPhoto id={photo._id} alt={photo.altText} />{photo.caption && <figcaption>{photo.caption}</figcaption>}</figure> : <div className="about-note"><span className="icon-disc"><Icon name="calendar" /></span><h2>Your guide to the event</h2><p>Find the next event, check the venue and keep up with organizer announcements.</p><p>All event times are shown in Indian Standard Time (IST). Statuses are updated by the organizers.</p><Link className="text-link" href="/schedule">Explore the schedule <Icon name="arrow" /></Link></div>}</aside></div>
    <section><SectionHeading number="Event categories" title="Find your event" /><p className="muted">Explore official standings and published results by category.</p>{categories === undefined ? <Skeleton /> : categories.some(item => item.isActive) ? <div className="category-guide">{categories.filter(item => item.isActive).map(item => <Link key={item._id} href={`/scoreboard/${item.slug}`}><strong>{item.name}</strong><span className="text-link">Standings <Icon name="arrow" /></span></Link>)}</div> : <p className="empty-note">The category guide will appear when categories are configured.</p>}</section>
    {settings?.contactInfo && <section><SectionHeading number="Event information" title="Get in touch" /><p className="about-intro">{settings.contactInfo}</p></section>}
  </>;
}
export default function Page() { return <><Nav /><main id="main-content" tabIndex={-1} className="shell"><Load>{edition => <About editionId={edition._id} />}</Load></main></>; }
