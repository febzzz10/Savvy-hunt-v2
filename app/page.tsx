import { Nav } from "@/components/public";
import { HomeContent } from "@/components/home";
export default function Home() { return <><Nav /><main id="main-content" tabIndex={-1} className="shell home-shell"><HomeContent /></main></>; }
