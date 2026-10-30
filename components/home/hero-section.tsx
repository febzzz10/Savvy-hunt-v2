import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { Icon } from "../ui";
import { HeroArtwork } from "./hero-artwork";
import "./hero.css";
const display = Cormorant_Garamond({ subsets: ["latin"], weight: "600", display: "swap", variable: "--font-hero" });
export function HeroSection() {
  return <section className={`festival-hero ${display.variable}`} aria-labelledby="festival-title">
    <HeroArtwork />
    <div className="festival-copy">
      <p className="festival-eyebrow">INTER-SCHOOL COMPETITION</p>
      <div className="festival-title-wrap">
        <h1 id="festival-title"><span>Savvy</span><span>Hunt</span></h1>
        <svg className="festival-underline" aria-hidden="true" viewBox="0 0 240 32" fill="none"><path d="M5 26C35 11 65 7 90 6L68 18C89 15 119 6 148 9L124 16C156 13 191 10 235 15" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" /><path d="M18 21C67 8 113 9 167 12" stroke="currentColor" strokeWidth="1.5" /></svg>
      </div>
      <p className="festival-tagline">Where Talent Takes<br />Centre Stage.</p>
      <div className="festival-actions"><Link className="button" href="/scoreboard">Explore Live Scoreboard <Icon name="arrow" /></Link><Link className="button secondary" href="/schedule"><Icon name="calendar" /> View Event Schedule</Link></div>
    </div>
  </section>;
}
