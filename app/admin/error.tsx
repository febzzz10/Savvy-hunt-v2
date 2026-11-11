"use client";
export default function AdminError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <section className="admin-message" role="alert">
    <span className="eyebrow">Something went wrong</span>
    <h1>This page could not load</h1>
    <p>The organizer workspace hit an unexpected error. Your data has not been changed.</p>
    <div className="actions"><button className="button" type="button" onClick={retry}>Try again</button><a className="button secondary" href="/admin">Return to overview</a></div>
  </section>;
}
