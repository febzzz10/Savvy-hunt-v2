import type { Metadata } from "next";
import { Nav } from "@/components/public";
import { HomeContent } from "@/components/home";
import { JsonLd } from "@/components/structured-data";
import { HOME_META, pageSchema } from "@/lib/structured-data";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() { return <><JsonLd data={pageSchema({ path: "/", name: HOME_META.title, description: HOME_META.description })} /><Nav /><main id="main-content" tabIndex={-1} className="shell home-shell"><HomeContent /></main></>; }
