"use client";
import { usePaginatedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
export default function Page() { const { results, status, loadMore } = usePaginatedQuery(api.admins.pageAudit, {}, { initialNumItems: 25 }); return <><h1>Audit history</h1>{results.map(log => <article className="card" key={log._id}><strong>{log.action}</strong> · {log.summary}<p>{log.reason}</p><small>{new Date(log.createdAt).toLocaleString()}</small></article>)}{status === "LoadingFirstPage" && <p>Loading audit history…</p>}{status === "CanLoadMore" && <button className="button secondary" onClick={() => loadMore(25)}>Load older records</button>}{status === "LoadingMore" && <p>Loading older records…</p>}</>; }
