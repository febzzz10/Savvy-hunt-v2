"use client";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function Page() {
  const { results, status, loadMore } = usePaginatedQuery(api.admins.pageAudit, {}, { initialNumItems: 25 });
  return <div className="audit-page">
    <h1>Audit history</h1>
    <p className="audit-intro">A chronological record of administrative changes. Entries are append-only and include the reason supplied for corrections and revocations.</p>
    <section className="audit-list" aria-label="Audit records">
      {results.map(log => <article className="card audit-item" key={log._id}>
        <span className="audit-dot" aria-hidden="true" />
        <div className="audit-item-body"><header><strong>{log.action}</strong><time dateTime={new Date(log.createdAt).toISOString()}>{new Date(log.createdAt).toLocaleString()}</time></header><p>{log.summary}</p>{log.reason && <p className="audit-reason"><span>Reason:</span> {log.reason}</p>}</div>
      </article>)}
    </section>
    {status === "LoadingFirstPage" && <p>Loading audit history…</p>}
    {status === "Exhausted" && !results.length && <div className="empty-state"><h3>No audit records yet</h3><p>Administrative changes will appear here as they happen.</p></div>}
    {status === "CanLoadMore" && <button className="button secondary" onClick={() => loadMore(25)}>Load older records</button>}
    {status === "LoadingMore" && <p>Loading older records…</p>}
  </div>;
}
