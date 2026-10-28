"use client";
import Link from "next/link";
export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main id="main-content" tabIndex={-1} className="shell"><h1>This page could not load</h1><p role="alert">Check your connection and try again. If a save or publication was interrupted, check the current official result before retrying.</p><div className="actions"><button className="button" onClick={reset}>Try again</button><Link className="button secondary" href="/">Return to Savvy Hunt</Link></div></main>;
}
