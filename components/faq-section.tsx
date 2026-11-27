import Link from "next/link";
import { faqItems } from "@/lib/structured-data";

/** Visible FAQ. The same items feed the FAQPage JSON-LD in app/results/layout.tsx, so text and markup always match. */
export function FaqSection() {
  const [results, scoreboard, when] = faqItems();
  return <section aria-labelledby="results-faq"><h2 id="results-faq">Frequently asked questions</h2>
    <h3>{results.question}</h3><p>{results.answer} Start with the <Link href="/results">official results</Link> above, or browse the <Link href="/schedule">event schedule</Link> to open a single event.</p>
    <h3>{scoreboard.question}</h3><p>{scoreboard.answer} Open the <Link href="/scoreboard">live scoreboard and points table</Link>.</p>
    <h3>{when.question}</h3><p>{when.answer} See the <Link href="/schedule">MGM Savvy Hunt event schedule</Link>.</p>
  </section>;
}
